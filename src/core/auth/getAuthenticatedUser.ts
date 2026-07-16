import "server-only";

import { cookies } from "next/headers";

import { PENDING_ACCESS, isRole, type AccessRole } from "@/core/auth/Role";
import { SESSION_COOKIE_NAME } from "@/core/auth/sessionCookie";
import { getFirebaseAdminAuth } from "@/core/firebase/firebaseAdmin";

export interface AuthenticatedUser {
	uid: string;
	displayName: string;
	/** `"pendente"` quando o token é válido mas ainda não recebeu custom claim de role (cadastro pendente de liberação). Nunca `null` — ver `AccessRole`. */
	role: AccessRole;
}

/**
 * Lê o cookie de sessão e valida o token no Firebase Admin.
 * Retorna `null` apenas quando não há sessão válida (sem cookie, token expirado/inválido).
 * Distingue de "autenticado mas sem role" (`role: "pendente"`) para permitir telas diferentes
 * para cada caso — ver `(protected)/layout.tsx`.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
	const cookieStore = await cookies();
	const idToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

	if (idToken === undefined || idToken === "") {
		return null;
	}

	try {
		const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
		const claimRole: unknown = decoded.role;

		return {
			uid: decoded.uid,
			displayName: decoded.name ?? "",
			role: isRole(claimRole) ? claimRole : PENDING_ACCESS,
		};
	} catch {
		return null;
	}
}
