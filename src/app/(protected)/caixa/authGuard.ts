import "server-only";

import { getServerSession, type ServerSession } from "@/core/auth/getServerSession";
import { CAIXA_ROLES } from "@/core/dashboard/consultas";

/**
 * Sessão+role compartilhada por toda server action de `/caixa/**` — cada action continua
 * chamando isso explicitamente ("cada rota/action se protege sozinha"), só a checagem em si
 * deixa de ser copiada em cada arquivo. Retorna `null` quando não há acesso; a mensagem de erro
 * específica de cada action continua sendo decidida no call site.
 */
export async function autorizarAcaoCaixa(): Promise<ServerSession | null> {
	const session = await getServerSession();
	if (session === null || !CAIXA_ROLES.includes(session.role)) {
		return null;
	}
	return session;
}
