"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { contatoInicialDeAluno } from "@/core/comunicacao/contatos/contatoDeAluno";
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
		const firestore = getFirebaseAdminFirestore();
		const pessoaRef = firestore.collection("pessoas").doc();
		const batch = firestore.batch();

		batch.set(pessoaRef, {
			...parsed.data,
			ativo: true,
			criadoViaContatoId: null,
			criadoEm: FieldValue.serverTimestamp(),
			email: null,
			telefone: null,
			wixContactId: null,
			origem: "manual",
		});

		// Aluno entra no funil de Vagões desde já; colaborador ainda não tem funil (ver
		// contatoInicialDeAluno) — quando o funil financeiro existir, entra aqui como um
		// caminho separado, sem mexer neste.
		if (parsed.data.tipo === "aluno") {
			const contatoRef = firestore.collection("contatos").doc();
			batch.set(contatoRef, contatoInicialDeAluno({ id: pessoaRef.id, nome: parsed.data.nome, status: parsed.data.status, ativo: true }));
		}

		await batch.commit();
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	revalidatePath("/vagoes");
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
