import "server-only";

import { getCopilotoEnv } from "@/core/copiloto/env";
import { GeminiApiError } from "@/core/copiloto/errors";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-flash-latest";

interface GeminiErrorBody {
	error?: { message?: string };
}

interface GeminiGenerateContentResponse {
	candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/**
 * POST autenticado no endpoint generateContent do Gemini, pedindo saída em
 * JSON estruturado (responseSchema) pra evitar parsear texto livre do modelo.
 */
export async function geminiGenerateJson(params: {
	systemInstruction: string;
	prompt: string;
	responseSchema: object;
}): Promise<string> {
	const { apiKey } = getCopilotoEnv();

	const response = await fetch(`${BASE_URL}/${MODEL}:generateContent`, {
		method: "POST",
		headers: {
			"x-goog-api-key": apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			systemInstruction: { parts: [{ text: params.systemInstruction }] },
			contents: [{ role: "user", parts: [{ text: params.prompt }] }],
			generationConfig: {
				responseMimeType: "application/json",
				responseSchema: params.responseSchema,
			},
		}),
	});

	if (!response.ok) {
		const errorBody = (await response.json().catch(() => null)) as GeminiErrorBody | null;
		throw new GeminiApiError(
			response.status,
			errorBody?.error?.message ?? `Gemini respondeu ${response.status}.`,
		);
	}

	const body = (await response.json()) as GeminiGenerateContentResponse;
	const texto = body.candidates?.[0]?.content?.parts?.[0]?.text;

	if (!texto) {
		throw new GeminiApiError(502, "Gemini não retornou conteúdo na resposta.");
	}

	return texto;
}
