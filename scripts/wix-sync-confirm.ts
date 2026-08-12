/**
 * Uso único (rodado manualmente, com aprovação explícita antes de cada execução):
 * npx tsx scripts/wix-sync-confirm.ts
 *
 * Espelha exatamente a lógica de confirmarSincronizacaoWix() em
 * src/app/(protected)/admin/wix-sync/actions.ts, mas roda fora do Next.js —
 * getServerSession() depende de cookies() de uma requisição real, que não
 * existe num script. Fora do checkout de sessão (não se aplica aqui: quem
 * roda este script já é o operador confiável, mesmo modelo de
 * scripts/set-role.ts e scripts/backfill-contatos-de-alunos.ts), a lógica de
 * gravação é idêntica à da Server Action — se a Server Action mudar, este
 * script deve mudar junto.
 *
 * Idempotente: seguro rodar de novo, não duplica (upsert por wix*Id).
 */
import "dotenv/config";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type DocumentData, type DocumentReference, type Firestore } from "firebase-admin/firestore";

import { contatoInicialDeAluno } from "../src/core/comunicacao/contatos/contatoDeAluno";
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
const LIMITE_POR_BATCH = 400;

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

interface Operacao {
	ref: DocumentReference;
	data: DocumentData;
	merge: boolean;
}

async function commitEmLotes(firestore: Firestore, operacoes: Operacao[]): Promise<void> {
	let batch = firestore.batch();
	let contadorNoBatch = 0;

	for (const operacao of operacoes) {
		if (operacao.merge) {
			batch.set(operacao.ref, operacao.data, { merge: true });
		} else {
			batch.set(operacao.ref, operacao.data);
		}
		contadorNoBatch += 1;

		if (contadorNoBatch >= LIMITE_POR_BATCH) {
			await batch.commit();
			batch = firestore.batch();
			contadorNoBatch = 0;
		}
	}

	if (contadorNoBatch > 0) {
		await batch.commit();
	}
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

	const pessoaIdPorWixContactIdComNovos = new Map(pessoaIdPorWixContactId);
	const novasPessoasRefs = planoPessoas.criar.map((item) => {
		const ref = firestore.collection("pessoas").doc();
		pessoaIdPorWixContactIdComNovos.set(item.wixContactId, ref.id);
		return { ref, item };
	});

	const turmaIdPorWixProductIdComNovos = new Map(turmaIdPorWixProductId);
	const novasTurmasRefs = planoTurmas.criar.map((item) => {
		const ref = firestore.collection("turmas").doc();
		turmaIdPorWixProductIdComNovos.set(item.wixProductId, ref.id);
		return { ref, item };
	});

	const planoRecebimentos = planejarRecebimentos(orders, pessoaIdPorWixContactIdComNovos, turmaIdPorWixProductIdComNovos, recebimentosExistentes);

	const operacoes: Operacao[] = [];

	novasPessoasRefs.forEach(({ ref, item }) => {
		operacoes.push({
			ref,
			merge: false,
			data: {
				tipo: "aluno",
				nome: item.nome,
				status: "lead",
				ativo: true,
				criadoViaContatoId: null,
				criadoEm: FieldValue.serverTimestamp(),
				email: item.email,
				telefone: item.telefone,
				wixContactId: item.wixContactId,
				origem: "wix",
			},
		});
		operacoes.push({
			ref: firestore.collection("contatos").doc(),
			merge: false,
			data: contatoInicialDeAluno({ id: ref.id, nome: item.nome, status: "lead", ativo: true }) as unknown as DocumentData,
		});
	});

	planoPessoas.atualizar.forEach((item) => {
		operacoes.push({
			ref: firestore.collection("pessoas").doc(item.pessoaId),
			merge: true,
			data: { nome: item.nome, email: item.email, telefone: item.telefone, origem: "wix" },
		});
	});

	novasTurmasRefs.forEach(({ ref, item }) => {
		operacoes.push({
			ref,
			merge: false,
			data: {
				nome: item.nome,
				mensalidadeCentavos: item.mensalidadeCentavos,
				repasseTipo: "percentual",
				repasseValor: 0,
				dataInicio: null,
				dataFim: null,
				educadorPessoaId: null,
				ativo: true,
				wixProductId: item.wixProductId,
				origem: "wix",
			},
		});
	});

	planoTurmas.atualizar.forEach((item) => {
		operacoes.push({
			ref: firestore.collection("turmas").doc(item.turmaId),
			merge: true,
			data: { nome: item.nome, mensalidadeCentavos: item.mensalidadeCentavos, origem: "wix" },
		});
	});

	planoRecebimentos.criar.forEach((item) => {
		operacoes.push({
			ref: firestore.collection("recebimentos").doc(),
			merge: false,
			data: {
				pessoaId: item.pessoaId,
				turmaId: item.turmaId,
				matriculaId: null,
				valorCentavos: item.valorCentavos,
				formaPagamento: "outro",
				origem: "wix",
				status: item.status,
				dataRecebimento: new Date(item.dataRecebimento),
				ativo: true,
				wixOrderId: item.wixOrderId,
				wixLineItemId: item.wixLineItemId,
			},
		});
	});

	console.log(`\nGravando ${operacoes.length} operações em lotes de ${LIMITE_POR_BATCH}...`);
	await commitEmLotes(firestore, operacoes);

	console.log("\n=== CONCLUÍDO ===");
	console.log(`Pessoas: ${planoPessoas.criar.length} criadas, ${planoPessoas.atualizar.length} atualizadas.`);
	console.log(`Turmas: ${planoTurmas.criar.length} criadas, ${planoTurmas.atualizar.length} atualizadas.`);
	console.log(`Recebimentos: ${planoRecebimentos.criar.length} criados (${planoRecebimentos.avisos.length} sem turma vinculada).`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
