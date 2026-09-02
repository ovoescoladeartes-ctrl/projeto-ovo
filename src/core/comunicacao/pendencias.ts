import "server-only";

import { calcularUrgencia } from "@/core/comunicacao/urgencia";

import type { Estagio } from "./contatos/schema";

/**
 * Estágios que geram pendência de comunicação + título exibido — fonte única usada tanto pela
 * prévia do Dashboard (`montarKpisEPendenciasComunicacao`) quanto pelo Checklist do Dia
 * (`core/comunicacao/checklist/consultas.ts`), pra não duplicar a regra "o que conta como
 * pendente" em dois lugares.
 */
export const TITULO_PENDENCIA_POR_ESTAGIO: Partial<Record<Estagio, string>> = {
	novo: "Lead sem resposta",
	em_conversa: "Conversa esfriando",
	experimental: "Experimental sem follow-up",
};

/** Um contato conta como pendente quando o estágio é um dos três acima E já passou do limiar de "recente" (urgencia.ts) — nunca por tempo desde a última mensagem (decisão fechada, ver design.md). */
export function contatoEhPendente(estagio: Estagio, estagioAtualizadoEm: string | null, agora: Date): boolean {
	return estagio in TITULO_PENDENCIA_POR_ESTAGIO && calcularUrgencia(estagioAtualizadoEm, agora) !== "recente";
}

/** Dias corridos desde `iso` até `agora`, arredondado pra baixo — mesma conta usada nos textos "há Nd sem atualização"/"aguardando há N dia(s)". */
export function diasDesde(iso: string | null, agora: Date): number {
	if (iso === null) {
		return 0;
	}
	return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}
