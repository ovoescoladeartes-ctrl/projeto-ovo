"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { matriculaInputSchema, matriculaUpdateInputSchema } from "@/core/matriculas/schema";
import { gerarProximoNumeroMatricula } from "@/core/pessoas/numeroMatricula";

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
	const matriculaRef = firestore.collection("matriculas").doc();
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

			tx.set(matriculaRef, {
				pessoaId: parsed.data.pessoaId,
				turmaId: parsed.data.turmaId,
				dataMatricula: new Date(parsed.data.dataMatricula),
				mensalidadeCombinadaCentavos: parsed.data.mensalidadeCombinadaCentavos,
				motivo: parsed.data.motivo,
				status: "ativa",
				ativo: true,
			});

			const pessoaUpdate: Record<string, unknown> = {};
			if (numeroMatriculaAluno !== null) {
				pessoaUpdate.numeroMatriculaAluno = numeroMatriculaAluno;
			}
			if (pessoaData.statusAluno === "lead") {
				pessoaUpdate.statusAluno = "matriculado";
			}
			if (Object.keys(pessoaUpdate).length > 0) {
				tx.set(pessoaRef, pessoaUpdate, { merge: true });
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
		const message =
			error instanceof Error && (error.message === "Turma não encontrada." || error.message === "Pessoa não encontrada.")
				? error.message
				: "Não foi possível matricular. Tente novamente.";
		return { status: "error", message };
	}

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

	try {
		await getFirebaseAdminFirestore().collection("matriculas").doc(parsed.data.id).set(
			{ status: "encerrada" },
			{ merge: true },
		);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath(`/pessoas/${parsed.data.pessoaId}`);
	return { status: "ok" };
}
