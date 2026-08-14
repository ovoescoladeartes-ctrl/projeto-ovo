"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import { contatoInicialDeAluno } from "@/core/comunicacao/contatos/contatoDeAluno";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { recalcularStatusAluno } from "@/core/pessoas/recalcularStatusAluno";
import { queryContactsByIds } from "@/core/wix/contacts";
import { WixApiError } from "@/core/wix/errors";
import { searchApprovedOrders } from "@/core/wix/orders";
import { queryAllProducts } from "@/core/wix/products";
import { planejarMatriculasRetroativas, planejarPessoas, planejarRecebimentos, planejarTurmas } from "@/core/wix/sync";
import type { WixContact, WixOrder, WixProduct } from "@/core/wix/types";

const LIMITE_POR_BATCH = 400;

export interface PreviewWixResult {
	status: "ok" | "error";
	message?: string;
	pessoas?: { criar: number; atualizar: number };
	turmas?: { criar: number; atualizar: number };
	recebimentos?: { criar: number; avisos: number; pulados: { motivo: string; quantidade: number }[] };
	matriculas?: { criar: number };
}

export interface ConfirmWixResult {
	status: "ok" | "error";
	message?: string;
	pessoasCriadas?: number;
	pessoasAtualizadas?: number;
	turmasCriadas?: number;
	turmasAtualizadas?: number;
	recebimentosCriados?: number;
	matriculasCriadas?: number;
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

/**
 * Data do pedido mais antigo de cada contato, entre os orders já buscados neste sync — usada
 * como `criadoEm` real da Pessoa em vez da hora em que o sync rodou (`FieldValue.serverTimestamp()`
 * mascarava a data real de entrada do aluno no sistema da Wix).
 */
function calcularDataMaisAntigaPorContactId(orders: WixOrder[]): Map<string, string> {
	const dataMaisAntigaPorContactId = new Map<string, string>();
	orders.forEach((order) => {
		const contactId = order.buyerInfo?.contactId;
		if (contactId === undefined) {
			return;
		}
		const data = order.createdDate ?? new Date().toISOString();
		const atual = dataMaisAntigaPorContactId.get(contactId);
		if (atual === undefined || data < atual) {
			dataMaisAntigaPorContactId.set(contactId, data);
		}
	});
	return dataMaisAntigaPorContactId;
}

interface ExistentesWix {
	pessoaIdPorWixContactId: Map<string, string>;
	turmaIdPorWixProductId: Map<string, string>;
	recebimentosExistentes: Set<string>;
	matriculasExistentes: Set<string>;
	numeroMatriculaAlunoPorPessoaId: Map<string, string | null>;
}

/**
 * Busca as coleções inteiras (mesmo padrão de caixa/page.tsx e do import CSV — escala de escola
 * pequena) e monta os mapas wix*Id → id do Firestore em memória. Também traz `matriculas` (pra
 * não duplicar matrícula num re-sync) e o `numeroMatriculaAluno` atual de cada pessoa (pra saber
 * quem ainda precisa de um número novo).
 */
async function carregarExistentes(): Promise<ExistentesWix> {
	const firestore = getFirebaseAdminFirestore();
	const [pessoasSnapshot, turmasSnapshot, recebimentosSnapshot, matriculasSnapshot] = await Promise.all([
		firestore.collection("pessoas").get(),
		firestore.collection("turmas").get(),
		firestore.collection("recebimentos").get(),
		firestore.collection("matriculas").get(),
	]);

	const pessoaIdPorWixContactId = new Map<string, string>();
	const numeroMatriculaAlunoPorPessoaId = new Map<string, string | null>();
	pessoasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as { wixContactId?: string | null; numeroMatriculaAluno?: string | null };
		if (data.wixContactId) {
			pessoaIdPorWixContactId.set(data.wixContactId, doc.id);
		}
		numeroMatriculaAlunoPorPessoaId.set(doc.id, data.numeroMatriculaAluno ?? null);
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

	const matriculasExistentes = new Set<string>();
	matriculasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as { pessoaId: string; turmaId: string };
		matriculasExistentes.add(`${data.pessoaId}:${data.turmaId}`);
	});

	return {
		pessoaIdPorWixContactId,
		turmaIdPorWixProductId,
		recebimentosExistentes,
		matriculasExistentes,
		numeroMatriculaAlunoPorPessoaId,
	};
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
	// quantos recebimentos (e, a partir deles, matrículas) resolveriam se o sync fosse confirmado agora.
	const pessoaIdPlaceholder = new Map(existentes.pessoaIdPorWixContactId);
	planoPessoas.criar.forEach((item) => pessoaIdPlaceholder.set(item.wixContactId, `novo:${item.wixContactId}`));
	const turmaIdPlaceholder = new Map(existentes.turmaIdPorWixProductId);
	planoTurmas.criar.forEach((item) => turmaIdPlaceholder.set(item.wixProductId, `novo:${item.wixProductId}`));

	const planoRecebimentos = planejarRecebimentos(orders, pessoaIdPlaceholder, turmaIdPlaceholder, existentes.recebimentosExistentes);

	const matriculasCandidatas = planejarMatriculasRetroativas(planoRecebimentos.criar).filter(
		(candidata) => !existentes.matriculasExistentes.has(`${candidata.pessoaId}:${candidata.turmaId}`),
	);

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
		matriculas: { criar: matriculasCandidatas.length },
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

/**
 * Sincroniza o Contato vinculado a uma Pessoa pra `estagio: "convertido"`, se ainda não estiver —
 * mesma sincronização que `matricular()` faz (`.../pessoas/[id]/actions.ts`), só que fora de
 * transação porque roda depois do commit em lote do sync, uma vez por pessoa afetada.
 */
async function sincronizarContatoConvertido(firestore: FirebaseFirestore.Firestore, pessoaId: string): Promise<void> {
	const contatoSnapshot = await firestore.collection("contatos").where("pessoaId", "==", pessoaId).limit(1).get();
	const [contatoDoc] = contatoSnapshot.docs;
	if (contatoDoc === undefined) {
		return;
	}
	const data = contatoDoc.data() as { estagio: string };
	if (data.estagio === "convertido") {
		return;
	}
	await contatoDoc.ref.set(
		{ estagio: "convertido", arquivadoMotivo: null, estagioAtualizadoEm: FieldValue.serverTimestamp() },
		{ merge: true },
	);
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
	const dataMaisAntigaPorContactId = calcularDataMaisAntigaPorContactId(orders);

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

	// "Se pagou, está matriculado": resolvido a partir dos próprios Recebimentos que este sync
	// está prestes a criar — pulando pares que já têm alguma Matrícula (idempotência de re-sync).
	const matriculasCandidatas = planejarMatriculasRetroativas(planoRecebimentos.criar).filter(
		(candidata) => !existentes.matriculasExistentes.has(`${candidata.pessoaId}:${candidata.turmaId}`),
	);
	const pessoaIdsComMatriculaNova = new Set(matriculasCandidatas.map((candidata) => candidata.pessoaId));

	const operacoes: Operacao[] = [];

	novasPessoasRefs.forEach(({ ref, item }) => {
		const statusAlunoInicial = pessoaIdsComMatriculaNova.has(ref.id) ? "matriculado" : "lead";
		const dataMaisAntiga = dataMaisAntigaPorContactId.get(item.wixContactId);
		operacoes.push({
			ref,
			merge: false,
			data: {
				nome: item.nome,
				ehAluno: true,
				ehProfessor: false,
				statusAluno: statusAlunoInicial,
				statusProfessor: null,
				numeroMatriculaAluno: null,
				numeroMatriculaProfessor: null,
				interesses: [],
				ativo: true,
				criadoViaContatoId: null,
				criadoEm: dataMaisAntiga !== undefined ? new Date(dataMaisAntiga) : FieldValue.serverTimestamp(),
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
			data: contatoInicialDeAluno({ id: ref.id, nome: item.nome, statusAluno: statusAlunoInicial, ativo: true }),
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
				// Assunto nasce em branco (mesmo padrão de dataInicio/educadorPessoaId incompletos até
				// alguém completar pela tela de editar) — a Wix não tem esse conceito, e adivinhar a
				// categoria a partir do nome do produto erraria mais do que ajudaria.
				assunto: "",
				tipo: item.tipo,
				mensalidadeCentavos: item.mensalidadeCentavos,
				repasseTipo: "percentual",
				repasseValor: 0,
				dataInicio: item.dataInicio !== null ? new Date(item.dataInicio) : null,
				dataFim: null,
				educadorPessoaId: null,
				capacidadeMaxima: null,
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
			data: { mensalidadeCentavos: item.mensalidadeCentavos, origem: "wix" },
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

	// Número de matrícula: atribuído uma única vez por pessoa, usando o ano da matrícula mais
	// antiga dela nesta leva (mesma regra de `gerarProximoNumeroMatricula`). Como esta função já
	// não é transacional por registro (é batch, mesmo padrão de baixa concorrência assumido pelo
	// resto do sync), o contador é lido uma vez e incrementado localmente em memória.
	const candidatasPorPessoaId = new Map<string, typeof matriculasCandidatas>();
	matriculasCandidatas.forEach((candidata) => {
		const lista = candidatasPorPessoaId.get(candidata.pessoaId) ?? [];
		lista.push(candidata);
		candidatasPorPessoaId.set(candidata.pessoaId, lista);
	});

	const pessoaRefPorId = new Map<string, FirebaseFirestore.DocumentReference>();
	novasPessoasRefs.forEach(({ ref }) => pessoaRefPorId.set(ref.id, ref));
	candidatasPorPessoaId.forEach((_lista, pessoaId) => {
		if (!pessoaRefPorId.has(pessoaId)) {
			pessoaRefPorId.set(pessoaId, firestore.collection("pessoas").doc(pessoaId));
		}
	});

	const contadorRef = firestore.collection("contadores").doc("pessoas");
	let proximoNumero: number | undefined;
	for (const [pessoaId, lista] of candidatasPorPessoaId) {
		const numeroAtual = existentes.numeroMatriculaAlunoPorPessoaId.get(pessoaId) ?? null;
		if (numeroAtual !== null) {
			continue;
		}
		if (proximoNumero === undefined) {
			const contadorDoc = await contadorRef.get();
			const dados = contadorDoc.data() ?? {};
			proximoNumero = (dados.proximoNumeroAluno as number | undefined) ?? (dados.proximoNumero as number | undefined) ?? 1;
		}
		const dataMaisAntigaDaPessoa = lista.reduce((a, b) => (a.dataMatricula <= b.dataMatricula ? a : b)).dataMatricula;
		const ano = new Date(dataMaisAntigaDaPessoa).getFullYear();
		const ref = pessoaRefPorId.get(pessoaId);
		if (ref !== undefined) {
			operacoes.push({ ref, merge: true, data: { numeroMatriculaAluno: `A-${ano}-${String(proximoNumero).padStart(4, "0")}` } });
		}
		proximoNumero += 1;
	}
	if (proximoNumero !== undefined) {
		operacoes.push({ ref: contadorRef, merge: true, data: { proximoNumeroAluno: proximoNumero } });
	}

	matriculasCandidatas.forEach((candidata) => {
		operacoes.push({
			ref: firestore.collection("matriculas").doc(),
			merge: false,
			data: {
				pessoaId: candidata.pessoaId,
				turmaId: candidata.turmaId,
				dataMatricula: new Date(candidata.dataMatricula),
				dataEncerramento: null,
				mensalidadeCombinadaCentavos: candidata.mensalidadeCombinadaCentavos,
				motivo: "Matrícula criada automaticamente pela sincronização Wix (pedido pago).",
				status: "ativa",
				ativo: true,
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

	// Pessoas recém-criadas já nascem com o statusAluno/estágio de Contato corretos (calculados
	// acima); esta passagem é o que corrige pessoas já existentes que só agora receberam sua
	// primeira Matrícula — recalcularStatusAluno/sincronizarContatoConvertido são idempotentes,
	// então rodar pra todo mundo (inclusive quem acabou de ser criado certo) é seguro.
	await Promise.all(
		[...pessoaIdsComMatriculaNova].map(async (pessoaId) => {
			await recalcularStatusAluno(firestore, pessoaId);
			await sincronizarContatoConvertido(firestore, pessoaId);
		}),
	);

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
		matriculasCriadas: matriculasCandidatas.length,
	};
}
