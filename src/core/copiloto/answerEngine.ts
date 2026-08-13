import { GeminiApiError } from "./errors";
import { geminiGenerateJson } from "./geminiClient";
import type { CopilotoCta } from "./types";

interface CopilotoResposta {
	texto: string;
	cta?: CopilotoCta;
}

const ROTAS_VALIDAS = ["/", "/vagoes", "/pessoas", "/pessoas/turmas", "/caixa"] as const;

const RESPONSE_SCHEMA = {
	type: "OBJECT",
	properties: {
		texto: { type: "STRING" },
		cta: {
			type: "OBJECT",
			nullable: true,
			properties: {
				label: { type: "STRING" },
				href: { type: "STRING", enum: ROTAS_VALIDAS },
			},
			required: ["label", "href"],
		},
	},
	required: ["texto"],
};

const SYSTEM_INSTRUCTION = `
Você é o Copiloto do painel interno de uma escola de artes. Responda em
português do Brasil, em 1-2 frases, direto ao ponto.

Responda SOMENTE com base nos dados fornecidos no contexto abaixo do prompt —
nunca invente números, nomes ou fatos que não estejam lá. Se o contexto não
tiver o suficiente pra responder, diga isso claramente em vez de chutar.

Quando fizer sentido levar a pessoa pra uma tela do sistema pra ver mais
detalhes ou agir, inclua um "cta" com label curto (ex: "Ver") e o href de uma
das rotas válidas. Caso contrário, omita o cta.
`.trim();

interface CopilotoRespostaBruta {
	texto: string;
	cta?: { label: string; href: string } | null;
}

function respostaFallback(): CopilotoResposta {
	return {
		texto: "Não consegui falar com o Copiloto agora — tenta de novo em instantes.",
	};
}

/**
 * Motor de resposta do Copiloto: manda a pergunta + um contexto com dados
 * reais do dashboard (já filtrado pela role de quem pergunta, ver
 * montarContextoCopiloto) pro Gemini, e pede de volta um JSON estruturado
 * { texto, cta? } já pronto pra exibir.
 */
export async function gerarResposta(pergunta: string, contexto: string): Promise<CopilotoResposta> {
	const prompt = `Contexto:\n${contexto}\n\nPergunta: ${pergunta}`;

	try {
		const bruto = await geminiGenerateJson({
			systemInstruction: SYSTEM_INSTRUCTION,
			prompt,
			responseSchema: RESPONSE_SCHEMA,
		});

		const resposta = JSON.parse(bruto) as CopilotoRespostaBruta;

		return {
			texto: resposta.texto,
			cta: resposta.cta ?? undefined,
		};
	} catch (erro) {
		if (erro instanceof GeminiApiError) {
			console.error(`[copiloto] Gemini falhou (${erro.httpStatus}): ${erro.message}`);
		} else {
			console.error("[copiloto] falha ao interpretar resposta do Gemini", erro);
		}

		return respostaFallback();
	}
}
