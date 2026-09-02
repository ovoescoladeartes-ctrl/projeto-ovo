"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import { alternarItemChecklistSchema, criarItemManualSchema } from "@/core/comunicacao/checklist/schema";
import { VAGOES_ROLES } from "@/core/dashboard/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

interface EstadoConclusaoChecklist {
	concluido: boolean;
	concluidoEm: Date | null;
	concluidoPor: string | null;
}

/**
 * Payload de conclusão de um item de checklist — mesma semântica do helper homônimo do Ritual
 * financeiro (`concluido`/`concluidoEm`/`concluidoPor`), reproduzida aqui em vez de importada de
 * `@/core/financeiro/shared` pra Comunicação não depender do checklist financeiro (feature ainda
 * não mesclada em `developer`).
 */
function montarEstadoConclusaoChecklist(concluido: boolean, uid: string): EstadoConclusaoChecklist {
	return {
		concluido,
		concluidoEm: concluido ? new Date() : null,
		concluidoPor: concluido ? uid : null,
	};
}

const COLECAO = "checklistComunicacaoDias";

export async function alternarItemChecklistComunicacao(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !VAGOES_ROLES.includes(session.role)) {
		return { status: "error", message: "Sem permissão para alterar o checklist." };
	}

	const parsed = alternarItemChecklistSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { dia, tipo, itemId, concluido } = parsed.data;
	const campo = tipo === "contato" ? `contatos.${itemId}` : `manuais.${itemId}`;

	try {
		if (tipo === "manual") {
			// Item manual guarda `titulo` além do estado de conclusão — usar dot-path só nos campos de
			// estado preserva o `titulo` já gravado (merge não apaga o que não está no payload).
			const estado = montarEstadoConclusaoChecklist(concluido, session.uid);
			await getFirebaseAdminFirestore()
				.collection(COLECAO)
				.doc(dia)
				.set(
					{
						[`${campo}.concluido`]: estado.concluido,
						[`${campo}.concluidoEm`]: estado.concluidoEm,
						[`${campo}.concluidoPor`]: estado.concluidoPor,
					},
					{ merge: true },
				);
		} else {
			await getFirebaseAdminFirestore()
				.collection(COLECAO)
				.doc(dia)
				.set({ [campo]: montarEstadoConclusaoChecklist(concluido, session.uid) }, { merge: true });
		}
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/");
	return { status: "ok" };
}

export async function criarItemManualChecklist(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !VAGOES_ROLES.includes(session.role)) {
		return { status: "error", message: "Sem permissão para alterar o checklist." };
	}

	const parsed = criarItemManualSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { dia, titulo } = parsed.data;
	const id = randomUUID();

	try {
		await getFirebaseAdminFirestore()
			.collection(COLECAO)
			.doc(dia)
			.set({ manuais: { [id]: { titulo, concluido: false, concluidoEm: null, concluidoPor: null } } }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/");
	return { status: "ok" };
}
