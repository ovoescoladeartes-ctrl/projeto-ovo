"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { criarPendenciaManualSchema, resolverPendenciaManualSchema } from "@/core/financeiro/pendencias/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];

function podeGerenciarCaixa(role: Role): boolean {
	return CAIXA_ROLES.includes(role);
}

/** Cria uma pendência manual aberta (ex.: "Nota fiscal faltando") — schema já existia (`criarPendenciaManualSchema`), faltava a action que o usa. */
export async function criarPendenciaManual(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarCaixa(session.role)) {
		return { status: "error", message: "Sem permissão para criar pendências." };
	}

	const parsed = criarPendenciaManualSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore()
			.collection("pendenciasManuais")
			.add({ ...parsed.data, status: "aberta", criadoEm: new Date() });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/");
	return { status: "ok" };
}

/**
 * Idempotente: checa `status !== "resolvida"` antes de gravar, mesma proteção contra duplo
 * clique de `marcarRepasseComoPago` (caixa/actions.ts).
 */
export async function resolverPendenciaManual(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarCaixa(session.role)) {
		return { status: "error", message: "Sem permissão para resolver pendências." };
	}

	const parsed = resolverPendenciaManualSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const ref = getFirebaseAdminFirestore().collection("pendenciasManuais").doc(parsed.data.id);

	try {
		const doc = await ref.get();
		if (!doc.exists) {
			return { status: "error", message: "Pendência não encontrada." };
		}
		if ((doc.data() as { status?: string })?.status === "resolvida") {
			return { status: "ok" };
		}

		await ref.set({ status: "resolvida", resolvidoEm: new Date() }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/");
	return { status: "ok" };
}
