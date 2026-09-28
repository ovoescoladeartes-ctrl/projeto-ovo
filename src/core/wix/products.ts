import "server-only";

import { wixFetch } from "@/core/wix/client";
import { wixProductsQueryResponseSchema, type WixProduct } from "@/core/wix/types";

const PRODUCTS_PER_PAGE = 100;
const MAX_PAGES = 20; // catálogo de 100 produtos já é bem acima do que a Ovo tem hoje (16).

/**
 * Busca todo o catálogo (Stores Catalog V3 — a Wix migrou o site da Ovo de V1
 * pra V3 em set/2026; V1 agora responde 501). O catálogo é pequeno o bastante
 * para não valer a pena filtrar por ID como em queryContactsByIds — busca tudo
 * e o sync filtra em memória pelos IDs vistos nos orders.
 */
export async function queryAllProducts(): Promise<WixProduct[]> {
	const results: WixProduct[] = [];
	let cursor: string | undefined;

	for (let page = 0; page < MAX_PAGES; page += 1) {
		const raw = await wixFetch<unknown>("/stores/v3/products/query", {
			query: { cursorPaging: { limit: PRODUCTS_PER_PAGE, cursor } },
		});
		const parsed = wixProductsQueryResponseSchema.parse(raw);
		results.push(...parsed.products);

		const nextCursor = parsed.pagingMetadata?.cursors?.next ?? undefined;
		if (parsed.pagingMetadata?.hasNext !== true || nextCursor === undefined || parsed.products.length === 0) {
			break;
		}
		cursor = nextCursor;
	}

	return results;
}
