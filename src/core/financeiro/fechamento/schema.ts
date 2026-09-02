import { z } from "zod";

import { FECHAMENTO_ITEM_IDS, type FechamentoItemId } from "./itens";
import { chavePeriodoValida } from "./periodo";

export interface FechamentoLinhaEstado {
	id: string;
	label: string;
	concluido: boolean;
	concluidoEm: string | null;
	concluidoPor: string | null;
	/** Linhas derivadas ("Reconciliar Semana N") não são clicáveis — refletem o Ritual, não se alteram aqui. */
	editavel: boolean;
}

export interface FechamentoConsolidado {
	periodo: string;
	periodoLabel: string;
	linhas: FechamentoLinhaEstado[];
	semanasFechadas: number;
	totalSemanas: number;
	pendenciasRestantes: number;
}

export const alternarItemFechamentoSchema = z.object({
	periodo: z.string().refine(chavePeriodoValida, "Período inválido."),
	itemId: z.enum(FECHAMENTO_ITEM_IDS),
	concluido: z.boolean(),
});

export type AlternarItemFechamentoInput = z.infer<typeof alternarItemFechamentoSchema>;
export type { FechamentoItemId };
