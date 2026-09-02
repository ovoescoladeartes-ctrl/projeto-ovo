import { z } from "zod";

import { RITUAL_ITEM_IDS, type RitualItemId } from "./itens";
import { chaveSemanaValida } from "./semana";

export interface RitualItemEstado {
	id: RitualItemId;
	label: string;
	concluido: boolean;
	concluidoEm: string | null;
	concluidoPor: string | null;
}

export interface RitualChecklistSemana {
	semana: string;
	itens: RitualItemEstado[];
}

export const alternarItemRitualSchema = z.object({
	semana: z.string().refine(chaveSemanaValida, "Semana inválida."),
	itemId: z.enum(RITUAL_ITEM_IDS),
	concluido: z.boolean(),
});

export type AlternarItemRitualInput = z.infer<typeof alternarItemRitualSchema>;
