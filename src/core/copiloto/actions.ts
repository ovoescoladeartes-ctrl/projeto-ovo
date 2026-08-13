"use server";

import { getServerSession } from "@/core/auth/getServerSession";

import { gerarResposta } from "./answerEngine";
import { montarContextoCopiloto } from "./contexto";
import type { CopilotoCta } from "./types";

interface CopilotoRespostaAction {
	texto: string;
	cta?: CopilotoCta;
}

export async function perguntarCopiloto(pergunta: string): Promise<CopilotoRespostaAction> {
	const session = await getServerSession();
	if (session === null) {
		return { texto: "Sua sessão expirou — recarregue a página e faça login de novo." };
	}

	const contexto = await montarContextoCopiloto(session.role);
	return gerarResposta(pergunta, contexto);
}
