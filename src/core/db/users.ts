import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { PENDING_ACCESS } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface UserDoc {
	nome?: string;
	email?: string | null;
	role?: string;
	criadoEm?: Timestamp;
}

export interface Usuario {
	uid: string;
	nome: string;
	email: string | null;
	role: string;
	criadoEm: string | null;
}

/**
 * Coleção inteira, ordenada por `criadoEm` desc aqui dentro (não via `.orderBy()` do Firestore,
 * que exclui silenciosamente qualquer doc sem o campo) — `/admin/usuarios` é o único consumidor.
 */
export const lerUsuarios = cacheDeColecao("usuarios", "users", async (): Promise<Usuario[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("users").get();
	registrarLeitura("users", snapshot.size);
	const usuarios = snapshot.docs.map((doc) => {
		const data = doc.data() as UserDoc;
		return {
			uid: doc.id,
			nome: data.nome ?? "(sem nome)",
			email: data.email ?? null,
			role: data.role ?? PENDING_ACCESS,
			criadoEm: toIso(data.criadoEm ?? null),
		};
	});
	return usuarios.sort((a, b) => (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""));
});
