import { z } from "zod";

import type { Origem } from "@/core/shared/origem";

export const REPASSE_TIPOS = ["percentual", "fixo"] as const;
export type RepasseTipo = (typeof REPASSE_TIPOS)[number];

const turmaBaseSchema = z.object({
	nome: z.string().trim().min(1, "Nome é obrigatório."),
	/** Assunto do curso (ex.: "Aquarela") — separado do nome de exibição, que pode incluir dia/horário. */
	assunto: z.string().trim().min(1, "Assunto é obrigatório."),
	mensalidadeCentavos: z.number().int().nonnegative(),
	repasseTipo: z.enum(REPASSE_TIPOS),
	repasseValor: z.number().nonnegative(),
	dataInicio: z.string().min(1, "Data de início é obrigatória."),
	dataFim: z.string().nullable().default(null),
	educadorPessoaId: z.string().nullable().default(null),
	/** `null` = sem limite. Só informativo por enquanto — não bloqueia matrícula. */
	capacidadeMaxima: z.number().int().positive().nullable().default(null),
});

function repassePercentualValido(data: { repasseTipo: RepasseTipo; repasseValor: number }): boolean {
	return data.repasseTipo !== "percentual" || data.repasseValor <= 100;
}

const REPASSE_PERCENTUAL_ISSUE: { message: string; path: string[] } = {
	message: "Repasse percentual deve ser entre 0 e 100.",
	path: ["repasseValor"],
};

export const turmaInputSchema = turmaBaseSchema.refine(repassePercentualValido, REPASSE_PERCENTUAL_ISSUE);

export const turmaUpdateInputSchema = turmaBaseSchema
	.extend({ id: z.string().min(1) })
	.refine(repassePercentualValido, REPASSE_PERCENTUAL_ISSUE);

export type TurmaInput = z.infer<typeof turmaInputSchema>;
export type TurmaUpdateInput = z.infer<typeof turmaUpdateInputSchema>;

export interface Turma {
	id: string;
	nome: string;
	assunto: string;
	mensalidadeCentavos: number;
	repasseTipo: RepasseTipo;
	repasseValor: number;
	dataInicio: string | null;
	dataFim: string | null;
	educadorPessoaId: string | null;
	capacidadeMaxima: number | null;
	ativo: boolean;
	/** Nulo em Turmas cadastradas antes da integração Wix existir. */
	wixProductId: string | null;
	origem: Origem;
}
