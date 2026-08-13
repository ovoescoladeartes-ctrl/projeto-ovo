import "server-only";

import { getWixEnv } from "@/core/wix/env";
import { WixApiError } from "@/core/wix/errors";

const BASE_URL = "https://www.wixapis.com";

interface WixErrorBody {
	message?: string;
	details?: { applicationError?: { code?: string } };
}

/**
 * POST autenticado num endpoint da Wix (todas as APIs usadas aqui — Contacts,
 * Stores Catalog V1, eCommerce Orders — expõem query/search via POST).
 * Somente leitura por convenção do módulo: nenhuma função deste core chama
 * métodos de escrita da Wix (regra de produto: "Trilho registra e reflete;
 * nunca executa a ação externa").
 */
export async function wixFetch<T>(path: string, body: unknown): Promise<T> {
	const { apiKey, siteId } = getWixEnv();

	const response = await fetch(`${BASE_URL}${path}`, {
		method: "POST",
		headers: {
			Authorization: apiKey,
			"wix-site-id": siteId,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorBody = (await response.json().catch(() => null)) as WixErrorBody | null;
		throw new WixApiError(
			response.status,
			errorBody?.message ?? `Wix respondeu ${response.status} em ${path}.`,
			errorBody?.details?.applicationError?.code ?? null,
		);
	}

	return (await response.json()) as T;
}
