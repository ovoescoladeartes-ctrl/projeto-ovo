/**
 * Uso: npx tsx scripts/wix-sync-preview.ts
 *
 * Roda o mesmo cálculo de previewSincronizacaoWix() fora do Next.js, direto
 * contra a Wix e o Firestore reais — só leitura, não grava nada. Serve pra
 * validar a pipeline inteira (client Wix + planejamento de sync) contra dados
 * de produção antes de confirmar pela UI em /admin/wix-sync.
 */
import "dotenv/config";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// src/core/wix/{client,contacts,products,orders,env}.ts importam "server-only", que lança
// erro fora de um Server Component do Next.js — este script reimplementa só o fetch (mesma
// lógica de scripts/wix-spike.ts) e reaproveita sync.ts/types.ts, que não têm essa restrição.
import { planejarPessoas, planejarRecebimentos, planejarTurmas } from "../src/core/wix/sync";
import {
	wixContactsQueryResponseSchema,
	wixOrdersSearchResponseSchema,
	wixProductsQueryResponseSchema,
	type WixContact,
	type WixOrder,
	type WixProduct,
} from "../src/core/wix/types";

const WIX_BASE_URL = "https://www.wixapis.com";

function wixAuthHeaders(): Record<string, string> {
	const apiKey = process.env.API_KEY_WIX ?? "";
	const siteId = process.env.WIX_SITE_ID ?? "";
	if (!apiKey || !siteId) {
		throw new Error("API_KEY_WIX e WIX_SITE_ID precisam estar no .env.");
	}
	return { Authorization: apiKey, "wix-site-id": siteId, "Content-Type": "application/json" };
}

async function wixPost<T>(path: string, body: unknown): Promise<T> {
	const response = await fetch(`${WIX_BASE_URL}${path}`, { method: "POST", headers: wixAuthHeaders(), body: JSON.stringify(body) });
	if (!response.ok) {
		const errorBody = await response.json().catch(() => null);
		throw new Error(`Wix respondeu ${response.status} em ${path}: ${JSON.stringify(errorBody)}`);
	}
	return (await response.json()) as T;
}

async function searchApprovedOrders(): Promise<WixOrder[]> {
	const results: WixOrder[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < 200; page += 1) {
		const raw = await wixPost<unknown>("/ecom/v1/orders/search", {
			search: { filter: { status: { $eq: "APPROVED" } }, cursorPaging: { limit: 100, cursor } },
		});
		const parsed = wixOrdersSearchResponseSchema.parse(raw);
		results.push(...parsed.orders);
		const nextCursor = parsed.metadata?.cursors?.next;
		if (parsed.metadata?.hasNext !== true || nextCursor === undefined || parsed.orders.length === 0) {
			break;
		}
		cursor = nextCursor;
	}
	return results;
}

async function queryAllProducts(): Promise<WixProduct[]> {
	const results: WixProduct[] = [];
	let offset = 0;
	for (let page = 0; page < 20; page += 1) {
		const raw = await wixPost<unknown>("/stores/v1/products/query", { query: { paging: { limit: 100, offset } } });
		const parsed = wixProductsQueryResponseSchema.parse(raw);
		results.push(...parsed.products);
		const total = parsed.totalResults ?? results.length;
		offset += parsed.products.length;
		if (parsed.products.length === 0 || offset >= total) {
			break;
		}
	}
	return results;
}

async function queryContactsByIds(ids: string[]): Promise<WixContact[]> {
	const uniqueIds = [...new Set(ids)];
	if (uniqueIds.length === 0) {
		return [];
	}
	const results: WixContact[] = [];
	for (let index = 0; index < uniqueIds.length; index += 100) {
		const chunk = uniqueIds.slice(index, index + 100);
		const raw = await wixPost<unknown>("/contacts/v4/contacts/query", { query: { filter: { id: { $in: chunk } }, paging: { limit: chunk.length } } });
		const parsed = wixContactsQueryResponseSchema.parse(raw);
		results.push(...parsed.contacts);
	}
	return results;
}

async function main(): Promise<void> {
	const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "";
	const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
	const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

	if (getApps().length === 0) {
		initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
	}

	const firestore = getFirestore();

	console.log("Buscando dados da Wix...");
	const orders = await searchApprovedOrders();
	const products = await queryAllProducts();
	const buyerContactIds = orders.map((order) => order.buyerInfo?.contactId).filter((id): id is string => id !== undefined);
	const contacts = await queryContactsByIds(buyerContactIds);

	console.log(
		`orders: ${orders.length}, products: ${products.length}, buyerContactIds únicos: ${new Set(buyerContactIds).size}, contacts resolvidos: ${contacts.length}`,
	);

	console.log("Lendo Firestore...");
	const [pessoasSnapshot, turmasSnapshot, recebimentosSnapshot] = await Promise.all([
		firestore.collection("pessoas").get(),
		firestore.collection("turmas").get(),
		firestore.collection("recebimentos").get(),
	]);

	const pessoaIdPorWixContactId = new Map<string, string>();
	pessoasSnapshot.docs.forEach((doc) => {
		const wixContactId = (doc.data() as { wixContactId?: string | null }).wixContactId;
		if (wixContactId) {
			pessoaIdPorWixContactId.set(wixContactId, doc.id);
		}
	});

	const turmaIdPorWixProductId = new Map<string, string>();
	turmasSnapshot.docs.forEach((doc) => {
		const wixProductId = (doc.data() as { wixProductId?: string | null }).wixProductId;
		if (wixProductId) {
			turmaIdPorWixProductId.set(wixProductId, doc.id);
		}
	});

	const recebimentosExistentes = new Set<string>();
	recebimentosSnapshot.docs.forEach((doc) => {
		const data = doc.data() as { wixOrderId?: string | null; wixLineItemId?: string | null };
		if (data.wixOrderId && data.wixLineItemId) {
			recebimentosExistentes.add(`${data.wixOrderId}:${data.wixLineItemId}`);
		}
	});

	const planoPessoas = planejarPessoas(orders, contacts, pessoaIdPorWixContactId);
	const planoTurmas = planejarTurmas(products, turmaIdPorWixProductId);

	const pessoaIdPlaceholder = new Map(pessoaIdPorWixContactId);
	planoPessoas.criar.forEach((item) => pessoaIdPlaceholder.set(item.wixContactId, `novo:${item.wixContactId}`));
	const turmaIdPlaceholder = new Map(turmaIdPorWixProductId);
	planoTurmas.criar.forEach((item) => turmaIdPlaceholder.set(item.wixProductId, `novo:${item.wixProductId}`));

	const planoRecebimentos = planejarRecebimentos(orders, pessoaIdPlaceholder, turmaIdPlaceholder, recebimentosExistentes);

	console.log("\n=== PESSOAS ===");
	console.log(`criar: ${planoPessoas.criar.length}, atualizar: ${planoPessoas.atualizar.length}`);
	planoPessoas.criar.forEach((pessoa) => console.log(`  + ${pessoa.nome} (${pessoa.email ?? "sem email"})`));

	console.log("\n=== TURMAS ===");
	console.log(`criar: ${planoTurmas.criar.length}, atualizar: ${planoTurmas.atualizar.length}`);
	planoTurmas.criar.forEach((turma) => console.log(`  + ${turma.nome} — R$${(turma.mensalidadeCentavos / 100).toFixed(2)}`));

	console.log("\n=== RECEBIMENTOS ===");
	console.log(`criar: ${planoRecebimentos.criar.length}, avisos: ${planoRecebimentos.avisos.length}, pulados: ${planoRecebimentos.pulados.length}`);
	const puladosPorMotivo = new Map<string, number>();
	planoRecebimentos.pulados.forEach((pulado) => puladosPorMotivo.set(pulado.motivo, (puladosPorMotivo.get(pulado.motivo) ?? 0) + 1));
	puladosPorMotivo.forEach((quantidade, motivo) => console.log(`  pulado (${quantidade}x): ${motivo}`));
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
