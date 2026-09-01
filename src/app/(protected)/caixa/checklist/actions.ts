"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { ritualAlternarItemSchema } from "@/core/financeiro/ritual/schema";
import { montarEstadoConclusaoChecklist } from "@/core/financeiro/shared";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];

function podeGerenciarCaixa(role: Role): boolean {
	return CAIXA_ROLES.includes(role);
}

export async function alternarItemRitual(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarCaixa(session.role)) {
		return { status: "error", message: "Sem permissão para alterar o checklist." };
	}

	const parsed = ritualAlternarItemSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { semana, itemId, concluido } = parsed.data;

	try {
		await getFirebaseAdminFirestore()
			.collection("ritualSemanas")
			.doc(semana)
			.set({ [itemId]: montarEstadoConclusaoChecklist(concluido, session.uid) }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	// Ritual alimenta as pendências herdadas (`/caixa/pendencias`), as linhas "Reconciliar Semana N"
	// do Fechamento (`/caixa/fechamento`) e, desde o Step 3D, a prévia do Ritual + pendências
	// herdadas na Home (`/`) — revalida as quatro além da própria rota.
	revalidatePath("/caixa/checklist");
	revalidatePath("/caixa/pendencias");
	revalidatePath("/caixa/fechamento");
	revalidatePath("/");
	return { status: "ok" };
}