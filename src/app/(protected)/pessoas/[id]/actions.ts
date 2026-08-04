"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { matriculaInputSchema } from "@/core/matriculas/schema";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const MATRICULAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

function podeGerenciarMatriculas(role: Role): boolean {
	return MATRICULAS_ROLES.includes(role);
}

export async function matricular(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarMatriculas(session.role)) {
		return { status: "error", message: "Sem permissão para matricular." };
	}

	const parsed = matriculaInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const firestore = getFirebaseAdminFirestore();

	try {
		const turmaDoc = await firestore.collection("turmas").doc(parsed.data.turmaId).get();
		if (!turmaDoc.exists) {
			return { status: "error", message: "Turma não encontrada." };
		}

		const mensalidadeCentavos = (turmaDoc.data() as { mensalidadeCentavos: number }).mensalidadeCentavos;

		await firestore.collection("matriculas").add({
			pessoaId: parsed.data.pessoaId,
			turmaId: parsed.data.turmaId,
			dataMatricula: new Date(parsed.data.dataMatricula),
			mensalidadeCombinadaCentavos: mensalidadeCentavos,
			status: "ativa",
			ativo: true,
		});
	} catch {
		return { status: "error", message: "Não foi possível matricular. Tente novamente." };
	}

	revalidatePath(`/pessoas/${parsed.data.pessoaId}`);
	return { status: "ok" };
}

const encerrarMatriculaInputSchema = z.object({
	id: z.string().min(1),
	pessoaId: z.string().min(1),
});

export async function encerrarMatricula(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarMatriculas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar matrículas." };
	}

	const parsed = encerrarMatriculaInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore().collection("matriculas").doc(parsed.data.id).set(
			{ status: "encerrada" },
			{ merge: true },
		);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath(`/pessoas/${parsed.data.pessoaId}`);
	return { status: "ok" };
}
