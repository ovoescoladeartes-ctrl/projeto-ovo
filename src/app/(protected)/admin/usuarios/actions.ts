"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import { PENDING_ACCESS, isAccessRole } from "@/core/auth/Role";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface UpdateUserRoleResult {
	status: "ok" | "error";
	message?: string;
}

const updateUserRoleSchema = z.object({
	uid: z.string().min(1),
	role: z.string().refine(isAccessRole, "Papel inválido."),
});

/**
 * Único caminho de UI para conceder ou revogar acesso — equivalente ao que
 * `scripts/set-role.ts` faz via CLI, mas chamado a partir de `/admin/usuarios`.
 * A checagem de `role === "admin"` é feita aqui dentro, no servidor, nunca só
 * escondendo o botão no client (constitution.md §5.2 — autorização em profundidade).
 */
export async function updateUserRole(uid: string, role: string): Promise<UpdateUserRoleResult> {
	const session = await getServerSession();

	if (session === null || session.role !== "admin") {
		return { status: "error", message: "Apenas administradores podem alterar papéis." };
	}

	const parsed = updateUserRoleSchema.safeParse({ uid, role });
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const targetRole = parsed.data.role;

	try {
		await getFirebaseAdminAuth().setCustomUserClaims(
			parsed.data.uid,
			targetRole === PENDING_ACCESS ? null : { role: targetRole },
		);

		await getFirebaseAdminFirestore().collection("users").doc(parsed.data.uid).set(
			{ role: targetRole, atualizadoEm: FieldValue.serverTimestamp() },
			{ merge: true },
		);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/admin/usuarios");

	return { status: "ok" };
}
