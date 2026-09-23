import "server-only";

import { calcularUrgencia, NIVEIS_PENDENCIA, type NivelPendencia } from "@/core/comunicacao/urgencia";

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
	return nivelPendencia(estagio, estagioAtualizadoEm, agora) !== null;
}

/**
 * Nível de urgência de um contato pendente, `null` se não for pendente — seleção única usada
 * tanto pela contagem do Checklist do Dia (`contarAguardandoPorUrgencia`) quanto pelo filtro
 * `?urgencia=` de Vagões, pra o número da linha do card bater com o board depois do clique.
 */
export function nivelPendencia(estagio: Estagio, estagioAtualizadoEm: string | null, agora: Date): NivelPendencia | null {
	if (!(estagio in TITULO_PENDENCIA_POR_ESTAGIO)) {
		return null;
	}
	const nivel = calcularUrgencia(estagioAtualizadoEm, agora);
	return nivel === "recente" ? null : nivel;
}

export type ContagemAguardandoResposta = Record<NivelPendencia, number>;

/** Quantos contatos pendentes há em cada nível — alimenta as linhas "N aguardando resposta — atenção/urgente" do Checklist do Dia. */
export function contarAguardandoPorUrgencia(
	contatos: readonly { estagio: string; estagioAtualizadoEm: string | null }[],
	agora: Date,
): ContagemAguardandoResposta {
	const contagem = Object.fromEntries(NIVEIS_PENDENCIA.map((nivel) => [nivel, 0])) as ContagemAguardandoResposta;
	contatos.forEach((contato) => {
		const nivel = nivelPendencia(contato.estagio as Estagio, contato.estagioAtualizadoEm, agora);
		if (nivel !== null) {
			contagem[nivel] += 1;
		}
	});
	return contagem;
}

/** Dias corridos desde `iso` até `agora`, arredondado pra baixo — mesma conta usada nos textos "há Nd sem atualização"/"aguardando há N dia(s)". */
export function diasDesde(iso: string | null, agora: Date): number {
	if (iso === null) {
		return 0;
	}
	return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}
