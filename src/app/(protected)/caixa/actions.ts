"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { recebimentoInputSchema } from "@/core/financeiro/recebimentos/schema";
import { repasseInputSchema } from "@/core/financeiro/repasses/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];

function podeGerenciarCaixa(role: Role): boolean {
	return CAIXA_ROLES.includes(role);
}

export async function criarRecebimento(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarCaixa(session.role)) {
		return { status: "error", message: "Sem permissão para registrar recebimentos." };
	}

	const parsed = recebimentoInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore()
			.collection("recebimentos")
			.add({
				...parsed.data,
				dataRecebimento: new Date(parsed.data.dataRecebimento),
				ativo: true,
			});
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/caixa");
	return { status: "ok" };
}

export async function criarRepasse(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarCaixa(session.role)) {
		return { status: "error", message: "Sem permissão para registrar repasses." };
	}

	const parsed = repasseInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore()
			.collection("repasses")
			.add({
				...parsed.data,
				vencimento: new Date(parsed.data.vencimento),
				status: "pendente",
				ativo: true,
			});
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/caixa");
	return { status: "ok" };
}

const idSchema = z.string().min(1);

/**
 * Idempotente: checa `status !== "pago"` antes de gravar, protegendo contra duplo clique
 * sem precisar de transação Firestore aqui (decisão do plano v1).
 */
export async function marcarRepasseComoPago(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarCaixa(session.role)) {
		return { status: "error", message: "Sem permissão para alterar repasses." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const ref = getFirebaseAdminFirestore().collection("repasses").doc(parsed.data);

	try {
		const doc = await ref.get();
		if (!doc.exists) {
			return { status: "error", message: "Repasse não encontrado." };
		}
		if ((doc.data() as { status?: string })?.status === "pago") {
			return { status: "ok" };
		}

		await ref.set({ status: "pago" }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/caixa");
	return { status: "ok" };
}
