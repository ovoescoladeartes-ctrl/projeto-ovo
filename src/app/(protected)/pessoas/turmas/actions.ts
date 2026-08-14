"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { upsertInteresse } from "@/core/interesses/actions";
import { recalcularStatusProfessor } from "@/core/pessoas/recalcularStatusProfessor";
import { turmaInputSchema, turmaUpdateInputSchema, type TurmaInput } from "@/core/turmas/schema";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const TURMAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

function podeGerenciarTurmas(role: Role): boolean {
	return TURMAS_ROLES.includes(role);
}

function turmaDocPayload(dados: TurmaInput): Record<string, unknown> {
	return {
		nome: dados.nome,
		assunto: dados.assunto,
		tipo: dados.tipo,
		mensalidadeCentavos: dados.mensalidadeCentavos,
		repasseTipo: dados.repasseTipo,
		repasseValor: dados.repasseValor,
		dataInicio: new Date(dados.dataInicio),
		dataFim: dados.dataFim ? new Date(dados.dataFim) : null,
		educadorPessoaId: dados.educadorPessoaId,
		capacidadeMaxima: dados.capacidadeMaxima,
	};
}

/** Duas turmas ativas não podem ter o mesmo nome exato — inativas podem repetir (são arquivo). */
async function existeTurmaAtivaComNome(nome: string, idParaIgnorar?: string): Promise<boolean> {
	const snapshot = await getFirebaseAdminFirestore()
		.collection("turmas")
		.where("ativo", "==", true)
		.where("nome", "==", nome)
		.get();
	return snapshot.docs.some((doc) => doc.id !== idParaIgnorar);
}

export async function criarTurma(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarTurmas(session.role)) {
		return { status: "error", message: "Sem permissão para cadastrar turmas." };
	}

	const parsed = turmaInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	if (await existeTurmaAtivaComNome(parsed.data.nome)) {
		return { status: "error", message: "Já existe uma turma ativa com esse nome." };
	}

	const firestore = getFirebaseAdminFirestore();

	try {
		await firestore.collection("turmas").add({ ...turmaDocPayload(parsed.data), ativo: true });
		if (parsed.data.educadorPessoaId !== null) {
			await recalcularStatusProfessor(firestore, parsed.data.educadorPessoaId);
		}
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	try {
		// Garante que o assunto da turma vira uma tag de interesse selecionável (item 1) — não
		// bloqueia a criação da turma se esse upsert falhar.
		await upsertInteresse(parsed.data.assunto);
	} catch {
		// Ignorado de propósito.
	}

	revalidatePath("/pessoas/turmas");
	return { status: "ok" };
}

export async function atualizarTurma(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarTurmas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar turmas." };
	}

	const parsed = turmaUpdateInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	if (await existeTurmaAtivaComNome(parsed.data.nome, parsed.data.id)) {
		return { status: "error", message: "Já existe uma turma ativa com esse nome." };
	}

	const firestore = getFirebaseAdminFirestore();
	const ref = firestore.collection("turmas").doc(parsed.data.id);

	try {
		const docAntes = await ref.get();
		const educadorAnterior = (docAntes.data() as { educadorPessoaId?: string | null } | undefined)?.educadorPessoaId ?? null;

		await ref.set(turmaDocPayload(parsed.data), { merge: true });

		const educadorNovo = parsed.data.educadorPessoaId;
		if (educadorAnterior !== null && educadorAnterior !== educadorNovo) {
			await recalcularStatusProfessor(firestore, educadorAnterior);
		}
		if (educadorNovo !== null) {
			await recalcularStatusProfessor(firestore, educadorNovo);
		}
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	try {
		// Mesmo upsert/checagem de duplicata do criarTurma — o assunto pode ter mudado na edição.
		await upsertInteresse(parsed.data.assunto);
	} catch {
		// Ignorado de propósito.
	}

	revalidatePath("/pessoas/turmas");
	return { status: "ok" };
}

const idSchema = z.string().min(1);

export async function inativarTurma(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarTurmas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar turmas." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const firestore = getFirebaseAdminFirestore();

	try {
		const doc = await firestore.collection("turmas").doc(parsed.data).get();
		const educadorPessoaId = (doc.data() as { educadorPessoaId?: string | null } | undefined)?.educadorPessoaId ?? null;

		await firestore.collection("turmas").doc(parsed.data).set({ ativo: false }, { merge: true });

		// Cascata: matrículas ativas dessa turma são encerradas (só `status`, nunca `ativo` —
		// são campos independentes no schema: `status` é o estado do vínculo, `ativo` é o
		// soft-delete padrão). Escala esperada (dezenas por turma) não exige chunking; se um dia
		// ultrapassar 500 writes, replicar o padrão `LIMITE_POR_BATCH` do import CSV.
		const matriculasAtivas = await firestore
			.collection("matriculas")
			.where("turmaId", "==", parsed.data)
			.where("status", "==", "ativa")
			.get();

		if (!matriculasAtivas.empty) {
			const batch = firestore.batch();
			matriculasAtivas.docs.forEach((doc) => {
				batch.set(doc.ref, { status: "encerrada" }, { merge: true });
			});
			await batch.commit();
		}

		if (educadorPessoaId !== null) {
			await recalcularStatusProfessor(firestore, educadorPessoaId);
		}
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas/turmas");
	return { status: "ok" };
}

/** Qualquer Matrícula (de qualquer status/histórico) ligada à turma bloqueia a exclusão permanente. */
async function motivoBloqueioExclusaoTurma(turmaId: string): Promise<string | null> {
	const matriculas = await getFirebaseAdminFirestore()
		.collection("matriculas")
		.where("turmaId", "==", turmaId)
		.limit(1)
		.get();

	if (!matriculas.empty) {
		return "Existem matrículas ligadas a essa turma. Resolva essas pendências (ou aceite que elas continuam como histórico arquivado) antes de excluir de vez.";
	}
	return null;
}

export interface VerificarBloqueioResult {
	bloqueado: boolean;
	motivo: string | null;
}

export async function verificarBloqueioExclusaoTurma(id: unknown): Promise<VerificarBloqueioResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { bloqueado: true, motivo: "Sem permissão." };
	}
	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { bloqueado: true, motivo: "Dados inválidos." };
	}
	const motivo = await motivoBloqueioExclusaoTurma(parsed.data);
	return { bloqueado: motivo !== null, motivo };
}

export async function excluirTurmaPermanentemente(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { status: "error", message: "Apenas administradores podem excluir permanentemente." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const ref = getFirebaseAdminFirestore().collection("turmas").doc(parsed.data);

	try {
		const doc = await ref.get();
		if (!doc.exists) {
			return { status: "error", message: "Turma não encontrada." };
		}
		if ((doc.data() as { ativo: boolean }).ativo) {
			return { status: "error", message: "Só é possível excluir permanentemente um registro já arquivado." };
		}

		const motivo = await motivoBloqueioExclusaoTurma(parsed.data);
		if (motivo !== null) {
			return { status: "error", message: motivo };
		}

		await ref.delete();
	} catch {
		return { status: "error", message: "Não foi possível excluir. Tente novamente." };
	}

	revalidatePath("/pessoas/turmas");
	return { status: "ok" };
}
