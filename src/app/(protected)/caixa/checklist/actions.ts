"use server";

import { revalidatePath } from "next/cache";

import { alternarItemRitualSchema } from "@/core/financeiro/ritual/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import type { ActionResult } from "../actions";
import { autorizarAcaoCaixa } from "../authGuard";

export async function alternarItemRitual(input: unknown): Promise<ActionResult> {
	const session = await autorizarAcaoCaixa();
	if (session === null) {
		return { status: "error", message: "Sem permissão para alterar o checklist." };
	}

	const parsed = alternarItemRitualSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { semana, itemId, concluido } = parsed.data;

	try {
		await getFirebaseAdminFirestore()
			.collection("ritual_checklist_semanas")
			.doc(semana)
			.set(
				{
					itens: {
						[itemId]: {
							concluido,
							concluidoEm: concluido ? new Date() : null,
							concluidoPor: concluido ? session.uid : null,
						},
					},
				},
				{ merge: true },
			);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/caixa/checklist");
	revalidatePath("/");
	revalidatePath("/caixa/fechamento");
	revalidatePath("/caixa/pendencias");
	return { status: "ok" };
}
