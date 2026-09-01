import { z } from "zod";

/**
 * Itens fixos do "Ritual de Segunda" (Figma: frame "Checklist — Ritual de Segunda", node
 * 239-2311) — v1 não permite personalização, só o estado de conclusão por semana é real.
 */
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

export const RITUAL_ITENS: readonly RitualItemDefinicao[] = [
	{ id: "checar-repasses", label: "Checar repasses do dia 15" },
	{ id: "exportar-relatorio", label: "Exportar relatório semanal" },
	{ id: "conferir-entradas", label: "Conferir entradas novas" },
	{ id: "confirmar-pix", label: "Confirmar Pix pendentes" },
	{ id: "revisar-falhas", label: "Revisar falhas de cobrança" },
];

export interface RitualItemEstado {
	id: RitualItemId;
	label: string;
	concluido: boolean;
	concluidoEm: string | null;
	concluidoPor: string | null;
}

export interface RitualSemana {
	/** Chave da semana = data (yyyy-MM-dd) da segunda-feira daquela semana. */
	semana: string;
	itens: RitualItemEstado[];
}

/** `semana` sempre tem o formato fixo "yyyy-MM-dd" (regex já garantiu isso antes de chamar). */
function parseSemana(semana: string): { ano: number; mes: number; dia: number } {
	return { ano: Number(semana.slice(0, 4)), mes: Number(semana.slice(5, 7)), dia: Number(semana.slice(8, 10)) };
}

export const semanaSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Semana inválida.")
	.refine((valor) => {
		const { ano, mes, dia } = parseSemana(valor);
		const data = new Date(ano, mes - 1, dia);
		// `Date` rola datas inexistentes (ex.: 2025-02-30 vira 2025-03-02) — comparar os componentes
		// de volta detecta isso.
		return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
	}, "Semana inválida.")
	.refine((valor) => {
		const { ano, mes, dia } = parseSemana(valor);
		return new Date(ano, mes - 1, dia).getDay() === 1;
	}, "Semana deve começar numa segunda-feira.");

export const ritualAlternarItemSchema = z.object({
	semana: semanaSchema,
	itemId: z.enum(RITUAL_ITEM_IDS),
	concluido: z.boolean(),
});

export type RitualAlternarItemInput = z.infer<typeof ritualAlternarItemSchema>;
