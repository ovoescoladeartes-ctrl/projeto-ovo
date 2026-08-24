"use server";

import { revalidatePath } from "next/cache";

import { alternarItemFechamentoSchema } from "@/core/financeiro/fechamento/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import type { ActionResult } from "../actions";
import { autorizarAcaoCaixa } from "../authGuard";

export async function alternarItemFechamento(input: unknown): Promise<ActionResult> {
	const session = await autorizarAcaoCaixa();
	if (session === null) {
		return { status: "error", message: "Sem permissão para alterar o fechamento." };
	}

	const parsed = alternarItemFechamentoSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { periodo, itemId, concluido } = parsed.data;

	try {
		await getFirebaseAdminFirestore()
			.collection("fechamentos_mensais")
			.doc(periodo)
			.set(
				{
					itensManuais: {
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

	revalidatePath("/caixa/fechamento");
	return { status: "ok" };
}
