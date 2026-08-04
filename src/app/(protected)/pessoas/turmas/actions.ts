"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
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
		mensalidadeCentavos: dados.mensalidadeCentavos,
		repasseTipo: dados.repasseTipo,
		repasseValor: dados.repasseValor,
		dataInicio: new Date(dados.dataInicio),
		dataFim: dados.dataFim ? new Date(dados.dataFim) : null,
		educadorPessoaId: dados.educadorPessoaId,
	};
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

	try {
		await getFirebaseAdminFirestore()
			.collection("turmas")
			.add({ ...turmaDocPayload(parsed.data), ativo: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
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

	try {
		await getFirebaseAdminFirestore()
			.collection("turmas")
			.doc(parsed.data.id)
			.set(turmaDocPayload(parsed.data), { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
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

	try {
		await getFirebaseAdminFirestore().collection("turmas").doc(parsed.data).set({ ativo: false }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas/turmas");
	return { status: "ok" };
}
