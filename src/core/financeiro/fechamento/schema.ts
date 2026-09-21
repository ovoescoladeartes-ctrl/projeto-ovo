import { z } from "zod";

import type { RitualItemId } from "@/core/financeiro/ritual/schema";

/**
 * Itens fixos do "Fechamento Mensal" — as semanas do mês não são mais uma linha resumo própria
 * (ver `FechamentoTarefaRecorrentePendente`, item 1 da 5ª rodada de feedback: um checkbox
 * "Reconciliar Semana N" sem dizer o que precisa ser feito não é acionável).
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
	/** Texto de ajuda opcional (ícone de interrogação no item, item 8 do feedback de revisão) — só pros itens cujo nome sozinho não deixa claro o que fazer. Nenhum dos 6 itens fixos precisou até agora. */
	explicacao?: string;
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
	id: FechamentoItemId;
	label: string;
	concluido: boolean;
	concluidoEm: string | null;
	concluidoPor: string | null;
	explicacao?: string;
}

/** Uma semana pendente dentro do agrupamento de uma tarefa recorrente — só o suficiente pra
 * identificar a linha no accordion e chamar `alternarItemRitual({ semana, itemId, concluido })`
 * (mesmo dado do Ritual, não uma cópia). */
export interface FechamentoSemanaDaTarefa {
	/** Chave da semana (yyyy-MM-dd da segunda). */
	semana: string;
	/** Ex.: "Semana 1 (07/09 a 13/09)". */
	label: string;
}

/**
 * Uma tarefa recorrente do Ritual (ex.: "Conferir entradas novas") com pelo menos 1 semana do mês
 * ainda não concluída — agrupada por tarefa, não repetida por semana (item 2 da 7ª rodada de
 * feedback: repetir a mesma linha 3x por 3 semanas pendentes parecia erro/duplicação). Tarefa
 * concluída em todas as semanas do mês não gera entrada nenhuma aqui.
 */
export interface FechamentoTarefaRecorrentePendente {
	itemId: RitualItemId;
	label: string;
	explicacao?: string;
	/** Ex.: "3 semanas pendentes (07/09 a 27/09)" — já formatado, do início da semana mais antiga ao fim da mais recente ainda pendente. */
	periodoLabel: string;
	/** Uma entrada por semana pendente dessa tarefa, em ordem cronológica — vira as linhas do accordion. */
	semanas: FechamentoSemanaDaTarefa[];
}

export interface FechamentoConsolidado {
	periodo: string;
	periodoLabel: string;
	linhas: FechamentoLinhaEstado[];
	tarefasRecorrentesPendentes: FechamentoTarefaRecorrentePendente[];
	semanasFechadas: number;
	totalSemanas: number;
}
