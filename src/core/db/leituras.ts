import "server-only";

const ATIVO = process.env.DEBUG_FIRESTORE_READS === "1" || process.env.NODE_ENV !== "production";

/**
 * Só é chamado quando o callback do `unstable_cache` REALMENTE roda — ou seja, num cache MISS.
 * Silêncio no terminal é a prova de que o cache pegou (ver seção "Verificação" do plano). Ligável
 * em Preview da Vercel via `DEBUG_FIRESTORE_READS=1` sem tocar produção.
 */
export function registrarLeitura(nome: string, docs: number): void {
	if (!ATIVO) {
		return;
	}
	// eslint-disable-next-line no-console
	console.log(`[firestore] MISS ${nome} → ${docs} doc(s)`);
}
