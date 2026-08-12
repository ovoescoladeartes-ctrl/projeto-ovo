import "server-only";

import { wixFetch } from "@/core/wix/client";
import { wixOrdersSearchResponseSchema, type WixOrder } from "@/core/wix/types";

const ORDERS_PER_PAGE = 100;
const MAX_PAGES = 200; // cap de segurança contra loop infinito por bug/mudança de contrato da API.

/**
 * Busca todo o histórico de orders aprovados (status APPROVED — por padrão a
 * API já filtra fora PENDING/REJECTED/INITIALIZED, mas o filtro é explícito
 * aqui para não depender do default). v1 sempre refaz o histórico completo;
 * idempotência na gravação evita duplicar (ver sync.ts).
 */
export async function searchApprovedOrders(): Promise<WixOrder[]> {
	const results: WixOrder[] = [];
	let cursor: string | undefined;

	for (let page = 0; page < MAX_PAGES; page += 1) {
		const raw = await wixFetch<unknown>("/ecom/v1/orders/search", {
			search: {
				filter: { status: { $eq: "APPROVED" } },
				cursorPaging: { limit: ORDERS_PER_PAGE, cursor },
			},
		});
		const parsed = wixOrdersSearchResponseSchema.parse(raw);
		results.push(...parsed.orders);

		const nextCursor = parsed.metadata?.cursors?.next;
		if (parsed.metadata?.hasNext !== true || nextCursor === undefined || parsed.orders.length === 0) {
			break;
		}
		cursor = nextCursor;
	}

	return results;
}
