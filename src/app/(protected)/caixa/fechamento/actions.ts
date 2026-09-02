"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { fechamentoAlternarItemSchema } from "@/core/financeiro/fechamento/schema";
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

/**
 * Só aceita os 6 itens fixos do Fechamento (`fechamentoAlternarItemSchema` valida `itemId` contra
 * `FECHAMENTO_ITEM_IDS`) — as 4 linhas "Reconciliar Semana N" são derivadas do Ritual e não têm
 * `itemId` correspondente aqui, então não há como alterá-las por esta ação.
 */
export async function alternarItemFechamento(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarCaixa(session.role)) {
		return { status: "error", message: "Sem permissão para alterar o fechamento." };
	}

	const parsed = fechamentoAlternarItemSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { periodo, itemId, concluido } = parsed.data;

	try {
		await getFirebaseAdminFirestore()
			.collection("fechamentosMensais")
			.doc(periodo)
			.set({ [itemId]: montarEstadoConclusaoChecklist(concluido, session.uid) }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/caixa/fechamento");
	return { status: "ok" };
}
