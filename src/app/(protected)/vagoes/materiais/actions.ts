"use server";

import { getServerSession } from "@/core/auth/getServerSession";
import { alternarItemMaterialSchema, criarItemMaterialSchema, excluirItemMaterialSchema } from "@/core/comunicacao/materiais/schema";
import { VAGOES_ROLES } from "@/core/dashboard/consultas";
import { revalidarColecoes } from "@/core/db/revalidar";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const COLECAO = "materiaisChecklist";

// Materiais também aparece em `/checklists` (aba Comunicação, seção "Materiais" — item 4 do
// feedback de revisão), além do card do dashboard — toda mutação revalida as duas rotas.
function revalidarMateriais(): void {
	revalidarColecoes(["materiaisChecklist"], ["/", "/checklists"]);
}

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
			.add({
				titulo: parsed.data.titulo,
				turmaId: parsed.data.turmaId,
				turmaNome: parsed.data.turmaNome,
				comprado: false,
				criadoEm: new Date(),
				criadoPor: session.uid,
			});
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidarMateriais();
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

	revalidarMateriais();
	return { status: "ok" };
}

export async function excluirItemMaterial(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !VAGOES_ROLES.includes(session.role)) {
		return { status: "error", message: "Sem permissão para excluir item de material." };
	}

	const parsed = excluirItemMaterialSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore().collection(COLECAO).doc(parsed.data.id).delete();
	} catch {
		return { status: "error", message: "Não foi possível excluir. Tente novamente." };
	}

	revalidarMateriais();
	return { status: "ok" };
}
