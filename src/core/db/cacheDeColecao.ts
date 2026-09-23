import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { type Colecao, TTL_SEGUNDOS } from "./tags";

/**
 * Embrulha uma função de leitura do Firestore em duas camadas de cache, cada uma com um
 * propósito diferente:
 * - `unstable_cache`: Data Cache da Vercel, compartilhado entre requests e instâncias,
 *   invalidado por `revalidateTag(colecao)` (ver `revalidar.ts`).
 * - `cache()` do React: dedupe dentro do MESMO render. Sem isso, duas chamadas concorrentes num
 *   cache frio disparariam duas leituras no Firestore — o `unstable_cache` sozinho não faz
 *   request coalescing.
 *
 * REGRAS INVIOLÁVEIS de toda função construída aqui — verificadas no fonte do Next 15.5.20
 * instalado (`node_modules/next/dist/server`):
 *
 * 1. É FOLHA. Nunca chama outra função também embrulhada por `cacheDeColecao`. Um `unstable_cache`
 *    aninhado dentro de outro seta `isNestedUnstableCache` e PULA A LEITURA DO CACHE em silêncio
 *    — sem erro, sem log (`web/spec-extension/unstable-cache.js`) — voltando a bater no Firestore
 *    a cada render sem que nada avise. Se uma função de agregação precisa de dados de várias
 *    coleções, ela recebe os arrays já lidos como parâmetro (funções puras em `core/dashboard`,
 *    `core/financeiro`, etc.), nunca chama `ler*()` internamente.
 * 2. Nunca chama `cookies()`/`headers()`/`getServerSession()` — o Next lança em runtime
 *    (`web/spec-extension/adapters/{cookies,headers}.js`). O gate de role fica sempre em quem
 *    CHAMA a função (page.tsx, server action), nunca aqui dentro.
 * 3. Nunca escreve no Firestore. `revalidateTag` durante a fase de render também lança
 *    (`server/web/spec-extension/revalidate.js`) — só é permitido em `after()`, action ou route
 *    handler.
 * 4. Só devolve valor JSON-safe (`string | number | boolean | null` e arrays/objetos disso) — o
 *    cache faz `JSON.stringify`/`parse` por baixo. `toIso()` já cobre `Timestamp`; usar `?? null`
 *    em todo campo opcional, porque `undefined` não sobrevive à volta.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesma forma do `Callback` interno de `unstable_cache` (`args: any[]`) e do `cache()` do React; é uma função identidade genérica.
export function cacheDeColecao<T extends (...args: any[]) => Promise<unknown>>(nome: string, colecao: Colecao, ler: T): T {
	return cache(unstable_cache(ler, [`db:${nome}`], { tags: [colecao], revalidate: TTL_SEGUNDOS })) as T;
}
