import "server-only";

import { wixFetch } from "@/core/wix/client";
import { wixProductsQueryResponseSchema, type WixProduct } from "@/core/wix/types";

const PRODUCTS_PER_PAGE = 100;
const MAX_PAGES = 20; // catálogo de 100 produtos já é bem acima do que a Ovo tem hoje (16).

/**
 * Busca todo o catálogo (Stores Catalog V1 — confirmado no spike que é a versão
 * ativa no site da Ovo; V3 responde erro CATALOG_V1_SITE_CALLING_CATALOG_V3_API).
 * O catálogo é pequeno o bastante para não valer a pena filtrar por ID como em
 * queryContactsByIds — busca tudo e o sync filtra em memória pelos IDs vistos
 * nos orders.
 */
export async function queryAllProducts(): Promise<WixProduct[]> {
	const results: WixProduct[] = [];
	let offset = 0;

	for (let page = 0; page < MAX_PAGES; page += 1) {
		const raw = await wixFetch<unknown>("/stores/v1/products/query", {
			query: { paging: { limit: PRODUCTS_PER_PAGE, offset } },
		});
		const parsed = wixProductsQueryResponseSchema.parse(raw);
		results.push(...parsed.products);

		const total = parsed.totalResults ?? results.length;
		offset += parsed.products.length;
		if (parsed.products.length === 0 || offset >= total) {
			break;
		}
	}

	return results;
}
