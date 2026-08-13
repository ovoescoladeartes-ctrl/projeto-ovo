import "server-only";

export interface CopilotoEnv {
	apiKey: string;
}

export function getCopilotoEnv(): CopilotoEnv {
	const apiKey = process.env.GEMINI_API_KEY ?? "";

	if (!apiKey) {
		throw new Error(
			"Copiloto (Gemini) não configurado. Preencha GEMINI_API_KEY no .env " +
				"(gerar em aistudio.google.com/apikey).",
		);
	}

	return { apiKey };
}
