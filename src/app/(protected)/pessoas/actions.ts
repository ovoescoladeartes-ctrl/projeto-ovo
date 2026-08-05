"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { ALUNO_STATUS, COLABORADOR_STATUS, pessoaInputSchema } from "@/core/pessoas/schema";

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
			});
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	return { status: "ok" };
}

const idSchema = z.string().min(1);

export async function inativarPessoa(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarPessoas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar pessoas." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
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
	status: z.string().min(1),
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

		const tipo = (doc.data() as { tipo?: string })?.tipo;
		const statusValidos: readonly string[] = tipo === "aluno" ? ALUNO_STATUS : COLABORADOR_STATUS;
		if (!statusValidos.includes(parsed.data.status)) {
			return { status: "error", message: "Status inválido para esse tipo de pessoa." };
		}

		await ref.set({ nome: parsed.data.nome, status: parsed.data.status }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data.id}`);
	return { status: "ok" };
}
