"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import { alternarItemMaterialSchema, criarItemMaterialSchema } from "@/core/comunicacao/materiais/schema";
import { VAGOES_ROLES } from "@/core/dashboard/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const COLECAO = "materiaisChecklist";

export async function criarItemMaterial(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !VAGOES_ROLES.includes(session.role)) {
		return { status: "error", message: "Sem permissão para adicionar material." };
	}

	const parsed = criarItemMaterialSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore()
			.collection(COLECAO)
			.add({ titulo: parsed.data.titulo, comprado: false, criadoEm: new Date(), criadoPor: session.uid });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/");
	return { status: "ok" };
}

export async function alternarItemMaterial(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !VAGOES_ROLES.includes(session.role)) {
		return { status: "error", message: "Sem permissão para alterar o checklist de materiais." };
	}

	const parsed = alternarItemMaterialSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const { id, comprado } = parsed.data;

	try {
		await getFirebaseAdminFirestore()
			.collection(COLECAO)
			.doc(id)
			.set(
				{ comprado, compradoEm: comprado ? new Date() : null, compradoPor: comprado ? session.uid : null },
				{ merge: true },
			);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/");
	return { status: "ok" };
}
