"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import { contatoInicialDeAluno } from "@/core/comunicacao/contatos/contatoDeAluno";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { queryContactsByIds } from "@/core/wix/contacts";
import { WixApiError } from "@/core/wix/errors";
import { searchApprovedOrders } from "@/core/wix/orders";
import { queryAllProducts } from "@/core/wix/products";
import { planejarPessoas, planejarRecebimentos, planejarTurmas } from "@/core/wix/sync";
import type { WixContact, WixOrder, WixProduct } from "@/core/wix/types";

const LIMITE_POR_BATCH = 400;

export interface PreviewWixResult {
	status: "ok" | "error";
	message?: string;
	pessoas?: { criar: number; atualizar: number };
	turmas?: { criar: number; atualizar: number };
	recebimentos?: { criar: number; avisos: number; pulados: { motivo: string; quantidade: number }[] };
}

export interface ConfirmWixResult {
	status: "ok" | "error";
	message?: string;
	pessoasCriadas?: number;
	pessoasAtualizadas?: number;
	turmasCriadas?: number;
	turmasAtualizadas?: number;
	recebimentosCriados?: number;
}

function mensagemErroWix(error: unknown): string {
	if (error instanceof WixApiError) {
		return `Wix respondeu com erro (${error.httpStatus}): ${error.message}`;
	}
	return "Não foi possível conectar com a Wix. Tente novamente.";
}

async function buscarDadosWix(): Promise<{ orders: WixOrder[]; contacts: WixContact[]; products: WixProduct[] }> {
	const orders = await searchApprovedOrders();
	const products = await queryAllProducts();
	const buyerContactIds = orders.map((order) => order.buyerInfo?.contactId).filter((id): id is string => id !== undefined);
	const contacts = await queryContactsByIds(buyerContactIds);
	return { orders, contacts, products };
}

interface ExistentesWix {
	pessoaIdPorWixContactId: Map<string, string>;
	turmaIdPorWixProductId: Map<string, string>;
	recebimentosExistentes: Set<string>;
}

/**
 * Busca as 3 coleções inteiras (mesmo padrão de caixa/page.tsx e do import CSV —
 * escala de escola pequena) e monta os mapas wix*Id → id do Firestore em memória.
 */
async function carregarExistentes(): Promise<ExistentesWix> {
	const firestore = getFirebaseAdminFirestore();
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

	return { pessoaIdPorWixContactId, turmaIdPorWixProductId, recebimentosExistentes };
}

export async function previewSincronizacaoWix(): Promise<PreviewWixResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { status: "error", message: "Apenas administradores podem sincronizar com a Wix." };
	}

	let wixData: { orders: WixOrder[]; contacts: WixContact[]; products: WixProduct[] };
	let existentes: ExistentesWix;
	try {
		[wixData, existentes] = await Promise.all([buscarDadosWix(), carregarExistentes()]);
	} catch (error) {
		return { status: "error", message: mensagemErroWix(error) };
	}

	const { orders, contacts, products } = wixData;
	const planoPessoas = planejarPessoas(orders, contacts, existentes.pessoaIdPorWixContactId);
	const planoTurmas = planejarTurmas(products, existentes.turmaIdPorWixProductId);

	// Preview não grava nada — usa um placeholder no lugar do id real só pra contar
	// quantos recebimentos resolveriam se o sync fosse confirmado agora.
	const pessoaIdPlaceholder = new Map(existentes.pessoaIdPorWixContactId);
	planoPessoas.criar.forEach((item) => pessoaIdPlaceholder.set(item.wixContactId, `novo:${item.wixContactId}`));
	const turmaIdPlaceholder = new Map(existentes.turmaIdPorWixProductId);
	planoTurmas.criar.forEach((item) => turmaIdPlaceholder.set(item.wixProductId, `novo:${item.wixProductId}`));

	const planoRecebimentos = planejarRecebimentos(orders, pessoaIdPlaceholder, turmaIdPlaceholder, existentes.recebimentosExistentes);

	const puladosPorMotivo = new Map<string, number>();
	planoRecebimentos.pulados.forEach((pulado) => {
		puladosPorMotivo.set(pulado.motivo, (puladosPorMotivo.get(pulado.motivo) ?? 0) + 1);
	});

	return {
		status: "ok",
		pessoas: { criar: planoPessoas.criar.length, atualizar: planoPessoas.atualizar.length },
		turmas: { criar: planoTurmas.criar.length, atualizar: planoTurmas.atualizar.length },
		recebimentos: {
			criar: planoRecebimentos.criar.length,
			avisos: planoRecebimentos.avisos.length,
			pulados: [...puladosPorMotivo.entries()].map(([motivo, quantidade]) => ({ motivo, quantidade })),
		},
	};
}

interface Operacao {
	ref: FirebaseFirestore.DocumentReference;
	data: object;
	merge: boolean;
}

async function commitEmLotes(firestore: FirebaseFirestore.Firestore, operacoes: Operacao[]): Promise<void> {
	let batch = firestore.batch();
	let contadorNoBatch = 0;

	for (const operacao of operacoes) {
		const data = operacao.data as FirebaseFirestore.DocumentData;
		if (operacao.merge) {
			batch.set(operacao.ref, data, { merge: true });
		} else {
			batch.set(operacao.ref, data);
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

export async function confirmarSincronizacaoWix(): Promise<ConfirmWixResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { status: "error", message: "Apenas administradores podem sincronizar com a Wix." };
	}

	// Rebusca da Wix no servidor em vez de confiar no preview do client — a Wix
	// pode ter mudado entre as duas chamadas (é a fonte de verdade, não o preview).
	let wixData: { orders: WixOrder[]; contacts: WixContact[]; products: WixProduct[] };
	let existentes: ExistentesWix;
	try {
		[wixData, existentes] = await Promise.all([buscarDadosWix(), carregarExistentes()]);
	} catch (error) {
		return { status: "error", message: mensagemErroWix(error) };
	}

	const { orders, contacts, products } = wixData;
	const firestore = getFirebaseAdminFirestore();

	const planoPessoas = planejarPessoas(orders, contacts, existentes.pessoaIdPorWixContactId);
	const planoTurmas = planejarTurmas(products, existentes.turmaIdPorWixProductId);

	// firestore.collection(...).doc() aloca um ID sem gravar nada (sem I/O) — dá pra
	// resolver pessoaId/turmaId de quem ainda vai ser criado antes de montar o plano
	// de Recebimentos, que depende desses IDs.
	const pessoaIdPorWixContactId = new Map(existentes.pessoaIdPorWixContactId);
	const novasPessoasRefs = planoPessoas.criar.map((item) => {
		const ref = firestore.collection("pessoas").doc();
		pessoaIdPorWixContactId.set(item.wixContactId, ref.id);
		return { ref, item };
	});

	const turmaIdPorWixProductId = new Map(existentes.turmaIdPorWixProductId);
	const novasTurmasRefs = planoTurmas.criar.map((item) => {
		const ref = firestore.collection("turmas").doc();
		turmaIdPorWixProductId.set(item.wixProductId, ref.id);
		return { ref, item };
	});

	const planoRecebimentos = planejarRecebimentos(orders, pessoaIdPorWixContactId, turmaIdPorWixProductId, existentes.recebimentosExistentes);

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
		// Todo aluno precisa aparecer em Vagões, não importa a origem — só na criação,
		// nunca na atualização, senão um re-sync duplicaria o card (ver contatoInicialDeAluno).
		operacoes.push({
			ref: firestore.collection("contatos").doc(),
			merge: false,
			data: contatoInicialDeAluno({ id: ref.id, nome: item.nome, status: "lead", ativo: true }),
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

	try {
		await commitEmLotes(firestore, operacoes);
	} catch {
		return {
			status: "error",
			message: "Falha ao gravar no meio da sincronização. Alguns lotes já processados podem ter sido salvos — rode de novo, é seguro (idempotente).",
		};
	}

	revalidatePath("/pessoas");
	revalidatePath("/pessoas/turmas");
	revalidatePath("/caixa");
	revalidatePath("/vagoes");

	return {
		status: "ok",
		pessoasCriadas: planoPessoas.criar.length,
		pessoasAtualizadas: planoPessoas.atualizar.length,
		turmasCriadas: planoTurmas.criar.length,
		turmasAtualizadas: planoTurmas.atualizar.length,
		recebimentosCriados: planoRecebimentos.criar.length,
	};
}
