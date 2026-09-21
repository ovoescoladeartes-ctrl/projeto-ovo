export interface ItemOrdenavelCard {
	/** 0 = item não atrasado; quanto maior, mais atrasado. Só comparável dentro do mesmo checklist (cada um usa sua própria unidade — semanas no Ritual, dias em Comunicação — nunca comparado entre checklists diferentes). */
	atraso: number;
	tipo: "acao" | "conferencia";
}

const RANK_TIPO: Record<ItemOrdenavelCard["tipo"], number> = { acao: 0, conferencia: 1 };

/**
 * Critério único de ordenação do card compacto de checklist (regra 38 do design.md), usado pelos
 * checklists de sistema e customizados — nunca reimplementado por checklist: (1) mais atrasado
 * primeiro, (2) em empate, Ações antes de Conferência, (3) em empate, ordem original do array
 * (preservada por `Array.prototype.sort` ser estável).
 */
export function ordenarItensCard<T extends ItemOrdenavelCard>(itens: readonly T[]): T[] {
	return [...itens].sort((a, b) => {
		if (a.atraso !== b.atraso) {
			return b.atraso - a.atraso;
		}
		return RANK_TIPO[a.tipo] - RANK_TIPO[b.tipo];
	});
}
