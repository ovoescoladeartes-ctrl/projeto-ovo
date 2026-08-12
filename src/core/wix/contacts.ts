import "server-only";

import { wixFetch } from "@/core/wix/client";
import { wixContactsQueryResponseSchema, type WixContact } from "@/core/wix/types";

const CONTACTS_PER_REQUEST = 100; // Wix aceita até 1000, mas o $in fica mais previsível em lotes menores.

function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

/**
 * Resolve só os contatos cujos IDs vieram de compradores de Orders (não busca
 * a base de Contacts inteira — decisão de escopo do sync, ver plano).
 */
export async function queryContactsByIds(ids: string[]): Promise<WixContact[]> {
	const uniqueIds = [...new Set(ids)];
	if (uniqueIds.length === 0) {
		return [];
	}

	const results: WixContact[] = [];
	for (const idsChunk of chunk(uniqueIds, CONTACTS_PER_REQUEST)) {
		const raw = await wixFetch<unknown>("/contacts/v4/contacts/query", {
			query: {
				filter: { id: { $in: idsChunk } },
				paging: { limit: idsChunk.length },
			},
		});
		const parsed = wixContactsQueryResponseSchema.parse(raw);
		results.push(...parsed.contacts);
	}

	return results;
}
