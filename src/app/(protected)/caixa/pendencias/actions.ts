"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { resolverPendenciaManualSchema } from "@/core/financeiro/pendencias/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];

function podeGerenciarCaixa(role: Role): boolean {
	return CAIXA_ROLES.includes(role);
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

	revalidatePath("/caixa/pendencias");
	return { status: "ok" };
}
