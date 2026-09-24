export type NivelUrgencia = "recente" | "atencao" | "urgente";

/** Níveis que contam como pendência ("recente" não é pendência) — valores aceitos no filtro `?urgencia=` de Vagões. */
export const NIVEIS_PENDENCIA = ["atencao", "urgente"] as const;
export type NivelPendencia = (typeof NIVEIS_PENDENCIA)[number];

/** Valor de `?urgencia=` inválido/ausente vira `null` (filtro ignorado, sem erro). */
export function parseNivelPendencia(valor: string | null | undefined): NivelPendencia | null {
	return NIVEIS_PENDENCIA.find((nivel) => nivel === valor) ?? null;
}

/**
 * Urgência conta desde `estagioAtualizadoEm`, nunca desde a última mensagem (decisão
 * fechada). Limiares (<24h / 24–72h / >72h) são provisórios — precisam validação com a
 * Katlin antes de fechar a fase; a regra de "desde a mudança de estágio" já está decidida.
 */
export function calcularUrgencia(estagioAtualizadoEm: string | null, agora: Date = new Date()): NivelUrgencia {
	if (estagioAtualizadoEm === null) {
		return "recente";
	}

	const horas = (agora.getTime() - new Date(estagioAtualizadoEm).getTime()) / (1000 * 60 * 60);

	if (horas < 24) {
		return "recente";
	}
	if (horas < 72) {
		return "atencao";
	}
	return "urgente";
}
