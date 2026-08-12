"use server";

import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { matriculaInputSchema, matriculaUpdateInputSchema } from "@/core/matriculas/schema";
import { gerarProximoNumeroMatricula } from "@/core/pessoas/numeroMatricula";
import { recalcularStatusAluno } from "@/core/pessoas/recalcularStatusAluno";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const MATRICULAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

function podeGerenciarMatriculas(role: Role): boolean {
	return MATRICULAS_ROLES.includes(role);
}

/**
 * Roda em transação porque toca dois documentos que precisam ficar consistentes entre si —
 * o número de matrícula é atribuído uma única vez, na primeira Matrícula real da pessoa — e
 * porque compartilha o contador global `contadores/pessoas` com o import CSV.
 */
export async function matricular(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarMatriculas(session.role)) {
		return { status: "error", message: "Sem permissão para matricular." };
	}

	const parsed = matriculaInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const firestore = getFirebaseAdminFirestore();
	const pessoaRef = firestore.collection("pessoas").doc(parsed.data.pessoaId);
	const turmaRef = firestore.collection("turmas").doc(parsed.data.turmaId);
	const contadorRef = firestore.collection("contadores").doc("pessoas");

	try {
		await firestore.runTransaction(async (tx) => {
			const [turmaDoc, pessoaDoc] = await Promise.all([tx.get(turmaRef), tx.get(pessoaRef)]);
			if (!turmaDoc.exists) {
				throw new Error("Turma não encontrada.");
			}
			if (!pessoaDoc.exists) {
				throw new Error("Pessoa não encontrada.");
			}

			// Único registro por (pessoa, turma), nunca mais de uma linha — se já existe um documento
			// (de qualquer status) pra esse par, reaproveita: bloqueia se estiver ativo, reativa (nova
			// data de matrícula, sem data de encerramento) se estiver encerrado. Só cria um documento
			// novo quando não existe nenhum. Diferente de `restaurarMatricula`, que mantém a data
			// original — aqui é tratado como uma entrada nova de verdade.
			const matriculasExistentes = await tx.get(
				firestore
					.collection("matriculas")
					.where("pessoaId", "==", parsed.data.pessoaId)
					.where("turmaId", "==", parsed.data.turmaId)
					.limit(1),
			);
			const matriculaExistenteDoc = matriculasExistentes.docs[0];
			if (matriculaExistenteDoc !== undefined) {
				const existente = matriculaExistenteDoc.data() as { status: string };
				if (existente.status === "ativa") {
					throw new Error("Essa pessoa já está matriculada nesta turma.");
				}
			}
			const matriculaRef = matriculaExistenteDoc?.ref ?? firestore.collection("matriculas").doc();

			const pessoaData = pessoaDoc.data() as { numeroMatriculaAluno?: string | null; statusAluno: string | null };

			// Contato vinculado (se existir) — a conversão que parte de Vagões (converterContatoEmPessoa)
			// já marca o Contato como "convertido"; esta é a mesma sincronização, disparada do lado de
			// Pessoas, pro caso de a pessoa ser matriculada direto por aqui em vez de arrastada no board.
			const contatoSnapshot = await tx.get(
				firestore.collection("contatos").where("pessoaId", "==", parsed.data.pessoaId).limit(1),
			);

			// Toda leitura (inclusive a do contador, dentro de gerarProximoNumeroMatricula) precisa
			// acontecer antes de qualquer escrita — regra de transação do Firestore.
			let numeroMatriculaAluno: string | null = null;
			if (pessoaData.numeroMatriculaAluno === null || pessoaData.numeroMatriculaAluno === undefined) {
				const ano = new Date(parsed.data.dataMatricula).getFullYear();
				numeroMatriculaAluno = await gerarProximoNumeroMatricula(tx, contadorRef, ano, "aluno");
			}

			// Histórico leve de reentrada — guarda o par (dataMatricula, dataEncerramento) de antes de
			// sobrescrever, só quando está reaproveitando um registro encerrado.
			let historicoReentrada: { dataMatricula: Timestamp | null; dataEncerramento: Timestamp | null } | null = null;
			if (matriculaExistenteDoc !== undefined) {
				const existenteCompleto = matriculaExistenteDoc.data() as {
					dataMatricula?: Timestamp;
					dataEncerramento?: Timestamp | null;
				};
				historicoReentrada = {
					dataMatricula: existenteCompleto.dataMatricula ?? null,
					dataEncerramento: existenteCompleto.dataEncerramento ?? null,
				};
			}

			tx.set(
				matriculaRef,
				{
					pessoaId: parsed.data.pessoaId,
					turmaId: parsed.data.turmaId,
					dataMatricula: new Date(parsed.data.dataMatricula),
					dataEncerramento: null,
					mensalidadeCombinadaCentavos: parsed.data.mensalidadeCombinadaCentavos,
					motivo: parsed.data.motivo,
					status: "ativa",
					ativo: true,
					...(historicoReentrada !== null ? { historicoReentradas: FieldValue.arrayUnion(historicoReentrada) } : {}),
				},
				{ merge: matriculaExistenteDoc !== undefined },
			);

			// statusAluno não é mais setado aqui — recalcularStatusAluno() decide sozinho, logo
			// depois desta transação, olhando se existe matrícula ativa de verdade (mesmo padrão de
			// recalcularStatusProfessor). Só o número de matrícula continua sendo gravado aqui, porque
			// é atribuído uma única vez e usa o ano de dataMatricula, não o de hoje.
			if (numeroMatriculaAluno !== null) {
				tx.set(pessoaRef, { numeroMatriculaAluno }, { merge: true });
			}

			const [contatoDoc] = contatoSnapshot.docs;
			if (contatoDoc !== undefined) {
				const contatoData = contatoDoc.data() as { estagio: string };
				if (contatoData.estagio !== "convertido") {
					tx.set(
						contatoDoc.ref,
						{ estagio: "convertido", arquivadoMotivo: null, estagioAtualizadoEm: FieldValue.serverTimestamp() },
						{ merge: true },
					);
				}
			}
		});
	} catch (error) {
		const mensagensConhecidas = [
			"Turma não encontrada.",
			"Pessoa não encontrada.",
			"Essa pessoa já está matriculada nesta turma.",
		];
		const message =
			error instanceof Error && mensagensConhecidas.includes(error.message)
				? error.message
				: "Não foi possível matricular. Tente novamente.";
		return { status: "error", message };
	}

	await recalcularStatusAluno(firestore, parsed.data.pessoaId);

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data.pessoaId}`);
	revalidatePath("/vagoes");
	return { status: "ok" };
}

export async function atualizarMatricula(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarMatriculas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar matrículas." };
	}

	const parsed = matriculaUpdateInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore()
			.collection("matriculas")
			.doc(parsed.data.id)
			.set(
				{ mensalidadeCombinadaCentavos: parsed.data.mensalidadeCombinadaCentavos, motivo: parsed.data.motivo },
				{ merge: true },
			);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data.pessoaId}`);
	return { status: "ok" };
}

const encerrarMatriculaInputSchema = z.object({
	id: z.string().min(1),
	pessoaId: z.string().min(1),
});

export async function encerrarMatricula(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarMatriculas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar matrículas." };
	}

	const parsed = encerrarMatriculaInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const firestore = getFirebaseAdminFirestore();
	try {
		await firestore.collection("matriculas").doc(parsed.data.id).set(
			{ status: "encerrada", dataEncerramento: FieldValue.serverTimestamp() },
			{ merge: true },
		);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	await recalcularStatusAluno(firestore, parsed.data.pessoaId);

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data.pessoaId}`);
	return { status: "ok" };
}

const restaurarMatriculaInputSchema = z.object({
	id: z.string().min(1),
	pessoaId: z.string().min(1),
});

/**
 * Desfaz um "Encerrar" por engano. Mesma checagem de duplicata do `matricular()` — não deixa
 * restaurar uma matrícula antiga enquanto já existe uma ativa na mesma turma.
 */
export async function restaurarMatricula(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarMatriculas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar matrículas." };
	}

	const parsed = restaurarMatriculaInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const firestore = getFirebaseAdminFirestore();
	const matriculaRef = firestore.collection("matriculas").doc(parsed.data.id);

	try {
		await firestore.runTransaction(async (tx) => {
			const matriculaDoc = await tx.get(matriculaRef);
			if (!matriculaDoc.exists) {
				throw new Error("Matrícula não encontrada.");
			}
			const matriculaData = matriculaDoc.data() as { pessoaId: string; turmaId: string };

			const matriculaAtivaExistente = await tx.get(
				firestore
					.collection("matriculas")
					.where("pessoaId", "==", matriculaData.pessoaId)
					.where("turmaId", "==", matriculaData.turmaId)
					.where("status", "==", "ativa")
					.limit(1),
			);
			if (!matriculaAtivaExistente.empty) {
				throw new Error("Essa pessoa já está matriculada nesta turma.");
			}

			tx.set(matriculaRef, { status: "ativa", dataEncerramento: null }, { merge: true });
		});
	} catch (error) {
		const mensagensConhecidas = ["Matrícula não encontrada.", "Essa pessoa já está matriculada nesta turma."];
		const message =
			error instanceof Error && mensagensConhecidas.includes(error.message)
				? error.message
				: "Não foi possível restaurar. Tente novamente.";
		return { status: "error", message };
	}

	await recalcularStatusAluno(firestore, parsed.data.pessoaId);

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data.pessoaId}`);
	return { status: "ok" };
}
