import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import type { Colecao } from "./tags";

/**
 * Ponto ÚNICO de invalidação de cache — toda action que escreve no Firestore chama isto, nunca
 * `revalidateTag`/`revalidatePath` diretamente. Regra de revisão (também rodável como grep):
 * `grep -rn "revalidatePath(\|revalidateTag(" src/ | grep -v "src/core/db/"` deve voltar vazio.
 *
 * Os `revalidatePath` continuam existindo por baixo: são eles que expiram o Router Cache do
 * cliente (sem isso a UI não atualiza depois da mutação). O que mudou é que o re-render que eles
 * agendam agora custa ~0 leitura no Firestore (a coleção que não mudou continua vindo do Data
 * Cache) — deixou de ser um problema de cota.
 */
export function revalidarColecoes(colecoes: readonly Colecao[], paths: readonly string[] = []): void {
	colecoes.forEach((colecao) => revalidateTag(colecao));
	paths.forEach((path) => revalidatePath(path));
}
