import { z } from "zod";

/**
 * Itens fixos do "Fechamento Mensal" além das 4 linhas de reconciliação semanal, que são
 * derivadas do Ritual (Figma: frame "Checklist — Fechamento Mensal", node 239-2483). O primeiro
 * item vem antes das semanas do mês, o restante depois — mesma ordem do Figma.
 */
export const FECHAMENTO_ITEM_IDS = [
	"assinar-conformidade",
	"emitir-notas",
	"apagar-provisorios",
	"validar-saldos",
	"confirmar-transferencias",
	"imprimir-termos",
] as const;

export type FechamentoItemId = (typeof FECHAMENTO_ITEM_IDS)[number];

export interface FechamentoItemDefinicao {
	id: FechamentoItemId;
	label: string;
}

export const FECHAMENTO_ITENS: readonly FechamentoItemDefinicao[] = [
	{ id: "assinar-conformidade", label: "Assinar declaração de conformidade contábil" },
	{ id: "emitir-notas", label: "Emitir notas fiscais em lote" },
	{ id: "apagar-provisorios", label: "Apagar lançamentos provisórios" },
	{ id: "validar-saldos", label: "Validar saldos com extrato bancário" },
	{ id: "confirmar-transferencias", label: "Confirmar transferências interbancárias" },
	{ id: "imprimir-termos", label: "Imprimir termos de encerramento" },
];

/** Mês restrito a "01"-"12" diretamente na regex — rejeita períodos como "2025-13". */
export const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Período inválido.");

export const fechamentoAlternarItemSchema = z.object({
	periodo: periodoSchema,
	itemId: z.enum(FECHAMENTO_ITEM_IDS),
	concluido: z.boolean(),
});

export type FechamentoAlternarItemInput = z.infer<typeof fechamentoAlternarItemSchema>;

export interface FechamentoLinhaEstado {
	id: string;
	label: string;
	concluido: boolean;
	concluidoEm: string | null;
	concluidoPor: string | null;
	/** Linhas "semana" espelham o Ritual daquela semana e não são alternáveis nesta tela. */
	tipo: "fixo" | "semana";
}

export interface FechamentoConsolidado {
	periodo: string;
	periodoLabel: string;
	linhas: FechamentoLinhaEstado[];
	semanasFechadas: number;
	totalSemanas: number;
	pendenciasRestantes: number;
}
