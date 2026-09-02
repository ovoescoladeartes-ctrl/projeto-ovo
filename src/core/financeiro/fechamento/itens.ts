export const FECHAMENTO_ITEM_IDS = [
	"assinar-declaracao",
	"emitir-notas-fiscais",
	"apagar-lancamentos-provisorios",
	"validar-saldos-extrato",
	"confirmar-transferencias",
	"imprimir-termo-encerramento",
] as const;

export type FechamentoItemId = (typeof FECHAMENTO_ITEM_IDS)[number];

export interface FechamentoItemDefinicao {
	id: FechamentoItemId;
	label: string;
}

/**
 * 6 itens manuais/independentes do Fechamento Mensal — os outros 4 da tela ("Reconciliar Semana
 * N") não vivem aqui, são derivados do Ritual de Segunda em `consultas.ts` pra não duplicar fonte
 * de verdade.
 */
export const FECHAMENTO_ITENS: readonly FechamentoItemDefinicao[] = [
	{ id: "assinar-declaracao", label: "Assinar declaração de conformidade contábil" },
	{ id: "emitir-notas-fiscais", label: "Emitir notas fiscais em lote" },
	{ id: "apagar-lancamentos-provisorios", label: "Apagar lançamentos provisórios" },
	{ id: "validar-saldos-extrato", label: "Validar saldos com extrato bancário" },
	{ id: "confirmar-transferencias", label: "Confirmar transferências interbancárias" },
	{ id: "imprimir-termo-encerramento", label: "Imprimir termo de encerramento" },
];
