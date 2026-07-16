import "server-only";

import { getAuthenticatedUser } from "@/core/auth/getAuthenticatedUser";
import { PENDING_ACCESS, type Role } from "@/core/auth/Role";

export interface ServerSession {
	uid: string;
	displayName: string;
	role: Role;
}

/**
 * Sessão de um usuário autenticado E com role já liberada.
 * Retorna `null` tanto para "não logado" quanto para "logado mas sem role ainda"
 * (`role: "pendente"`) — quem precisa distinguir os dois casos usa `getAuthenticatedUser`
 * diretamente.
 */
export async function getServerSession(): Promise<ServerSession | null> {
	const user = await getAuthenticatedUser();

	if (user === null || user.role === PENDING_ACCESS) {
		return null;
	}

	return { uid: user.uid, displayName: user.displayName, role: user.role };
}
