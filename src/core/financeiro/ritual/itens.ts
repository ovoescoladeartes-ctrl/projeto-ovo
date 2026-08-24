export const RITUAL_ITEM_IDS = [
	"checar-repasses",
	"exportar-relatorio",
	"conferir-entradas",
	"confirmar-pix",
	"revisar-falhas",
] as const;

export type RitualItemId = (typeof RITUAL_ITEM_IDS)[number];

export interface RitualItemDefinicao {
	id: RitualItemId;
	label: string;
}

/**
 * Itens fixos em código (v1) — a "personalização" do checklist (mini-prd.md v2 #1) fica pra
 * quando a tela de Configurações do Caixa for desenhada; por enquanto só o estado de conclusão
 * por semana é real, os itens em si não são editáveis pela usuária.
 */
export const RITUAL_ITENS: readonly RitualItemDefinicao[] = [
	{ id: "checar-repasses", label: "Checar repasses do dia 15" },
	{ id: "exportar-relatorio", label: "Exportar relatório semanal" },
	{ id: "conferir-entradas", label: "Conferir entradas novas" },
	{ id: "confirmar-pix", label: "Confirmar Pix pendentes" },
	{ id: "revisar-falhas", label: "Revisar falhas de cobrança" },
];
