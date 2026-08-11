"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { pessoaInputSchema } from "@/core/pessoas/schema";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

function podeGerenciarPessoas(role: Role): boolean {
	return PESSOAS_ROLES.includes(role);
}

/**
 * Checagem de role feita aqui dentro, no servidor — a sidebar só filtra a UI,
 * quem barra de verdade é a action (mesmo padrão de admin/usuarios/actions.ts).
 */
export async function criarPessoa(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarPessoas(session.role)) {
		return { status: "error", message: "Sem permissão para cadastrar pessoas." };
	}

	const parsed = pessoaInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore()
			.collection("pessoas")
			.add({
				...parsed.data,
				ativo: true,
				criadoViaContatoId: null,
				criadoEm: FieldValue.serverTimestamp(),
				numeroMatricula: null,
			});
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	return { status: "ok" };
}

const idSchema = z.string().min(1);

interface MatriculaAtivaDoc {
	turmaId: string;
}

/**
 * Arquivar um aluno com matrícula ativa não faz sentido — o vínculo com a turma continua valendo.
 * Encerrar a matrícula (já existe na tabela de Matrículas da tela de detalhe) é o pré-requisito.
 */
async function motivoBloqueioArquivarPessoa(pessoaId: string): Promise<string | null> {
	const firestore = getFirebaseAdminFirestore();
	const matriculasAtivas = await firestore
		.collection("matriculas")
		.where("pessoaId", "==", pessoaId)
		.where("status", "==", "ativa")
		.get();

	if (matriculasAtivas.empty) {
		return null;
	}

	const turmaIds = matriculasAtivas.docs.map((doc) => (doc.data() as MatriculaAtivaDoc).turmaId);
	const turmaDocs = await Promise.all(turmaIds.map((turmaId) => firestore.collection("turmas").doc(turmaId).get()));
	const nomesTurmas = turmaDocs.map((doc) => (doc.data() as { nome?: string } | undefined)?.nome ?? "(turma removida)");

	return `Essa pessoa tem matrícula ativa em ${nomesTurmas.join(", ")}. Encerre a matrícula antes de arquivar.`;
}

export async function inativarPessoa(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarPessoas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar pessoas." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const motivo = await motivoBloqueioArquivarPessoa(parsed.data);
	if (motivo !== null) {
		return { status: "error", message: motivo };
	}

	try {
		await getFirebaseAdminFirestore().collection("pessoas").doc(parsed.data).set(
			{ ativo: false },
			{ merge: true },
		);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data}`);
	return { status: "ok" };
}

const pessoaUpdateInputSchema = z.object({
	id: z.string().min(1),
	nome: z.string().trim().min(1, "Nome é obrigatório."),
	interesses: z.array(z.string()).optional(),
});

export async function atualizarPessoa(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarPessoas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar pessoas." };
	}

	const parsed = pessoaUpdateInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const ref = getFirebaseAdminFirestore().collection("pessoas").doc(parsed.data.id);

	try {
		const doc = await ref.get();
		if (!doc.exists) {
			return { status: "error", message: "Pessoa não encontrada." };
		}

		const updatePayload: Record<string, unknown> = { nome: parsed.data.nome };
		if (parsed.data.interesses !== undefined) {
			updatePayload.interesses = parsed.data.interesses;
		}

		await ref.set(updatePayload, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data.id}`);
	return { status: "ok" };
}

/**
 * Qualquer vínculo (Matrícula ou Recebimento, de qualquer status/histórico) bloqueia a exclusão
 * permanente — só o soft-delete (arquivar) fica disponível enquanto isso existir.
 */
async function motivoBloqueioExclusaoPessoa(pessoaId: string): Promise<string | null> {
	const firestore = getFirebaseAdminFirestore();
	const [matriculas, recebimentos] = await Promise.all([
		firestore.collection("matriculas").where("pessoaId", "==", pessoaId).limit(1).get(),
		firestore.collection("recebimentos").where("pessoaId", "==", pessoaId).limit(1).get(),
	]);

	if (!matriculas.empty || !recebimentos.empty) {
		return "Existem matrículas ou recebimentos ligados a essa pessoa. Resolva essas pendências (ou aceite que elas continuam como histórico arquivado) antes de excluir de vez.";
	}
	return null;
}

export interface VerificarBloqueioResult {
	bloqueado: boolean;
	motivo: string | null;
}

export async function verificarBloqueioExclusaoPessoa(id: unknown): Promise<VerificarBloqueioResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { bloqueado: true, motivo: "Sem permissão." };
	}
	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { bloqueado: true, motivo: "Dados inválidos." };
	}
	const motivo = await motivoBloqueioExclusaoPessoa(parsed.data);
	return { bloqueado: motivo !== null, motivo };
}

export async function excluirPessoaPermanentemente(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { status: "error", message: "Apenas administradores podem excluir permanentemente." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const ref = getFirebaseAdminFirestore().collection("pessoas").doc(parsed.data);

	try {
		const doc = await ref.get();
		if (!doc.exists) {
			return { status: "error", message: "Pessoa não encontrada." };
		}
		if ((doc.data() as { ativo: boolean }).ativo) {
			return { status: "error", message: "Só é possível excluir permanentemente um registro já arquivado." };
		}

		const motivo = await motivoBloqueioExclusaoPessoa(parsed.data);
		if (motivo !== null) {
			return { status: "error", message: motivo };
		}

		await ref.delete();
	} catch {
		return { status: "error", message: "Não foi possível excluir. Tente novamente." };
	}

	revalidatePath("/pessoas");
	return { status: "ok" };
}
