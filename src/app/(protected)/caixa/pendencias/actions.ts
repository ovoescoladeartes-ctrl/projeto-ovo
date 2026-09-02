"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PENDENCIA_MANUAL_IDS } from "@/core/financeiro/pendencias/manuais";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import type { ActionResult } from "../actions";
import { autorizarAcaoCaixa } from "../authGuard";

const marcarPendenciaManualSchema = z.object({ id: z.enum(PENDENCIA_MANUAL_IDS) });

export async function marcarPendenciaManualResolvida(input: unknown): Promise<ActionResult> {
	const session = await autorizarAcaoCaixa();
	if (session === null) {
		return { status: "error", message: "Sem permissão para alterar pendências." };
	}

	const parsed = marcarPendenciaManualSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore()
			.collection("pendencias_manuais")
			.doc(parsed.data.id)
			.set({ resolvido: true, resolvidoEm: new Date(), resolvidoPor: session.uid }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/caixa/pendencias");
	return { status: "ok" };
}
