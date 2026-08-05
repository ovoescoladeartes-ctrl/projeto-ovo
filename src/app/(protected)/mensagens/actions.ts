"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { mensagemInputSchema } from "@/core/comunicacao/mensagens/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const MENSAGENS_ROLES: readonly Role[] = ["admin", "comunicacao"];

function podeGerenciarMensagens(role: Role): boolean {
	return MENSAGENS_ROLES.includes(role);
}

export async function criarMensagem(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarMensagens(session.role)) {
		return { status: "error", message: "Sem permissão para cadastrar mensagens." };
	}

	const parsed = mensagemInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore()
			.collection("mensagens")
			.add({ ...parsed.data, ativo: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/mensagens");
	return { status: "ok" };
}

const mensagemUpdateInputSchema = mensagemInputSchema.extend({ id: z.string().min(1) });

export async function atualizarMensagem(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarMensagens(session.role)) {
		return { status: "error", message: "Sem permissão para alterar mensagens." };
	}

	const parsed = mensagemUpdateInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore()
			.collection("mensagens")
			.doc(parsed.data.id)
			.set({ categoria: parsed.data.categoria, titulo: parsed.data.titulo, texto: parsed.data.texto }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/mensagens");
	return { status: "ok" };
}

const idSchema = z.string().min(1);

export async function inativarMensagem(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarMensagens(session.role)) {
		return { status: "error", message: "Sem permissão para alterar mensagens." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore().collection("mensagens").doc(parsed.data).set({ ativo: false }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/mensagens");
	return { status: "ok" };
}
