import { z } from "zod";

import { ORIGENS, type Origem } from "@/core/financeiro/shared";

export const DESTINO_TIPOS = ["educador", "espaco", "outro"] as const;
export type DestinoTipo = (typeof DESTINO_TIPOS)[number];

export const REPASSE_STATUS = ["pendente", "pago"] as const;
export type RepasseStatus = (typeof REPASSE_STATUS)[number];

const repasseBaseSchema = z.object({
	destinoTipo: z.enum(DESTINO_TIPOS),
	destinoPessoaId: z.string().nullable().default(null),
	turmaId: z.string().nullable().default(null),
	valorCentavos: z.number().int().positive("Valor deve ser maior que zero."),
	vencimento: z.string().min(1, "Vencimento é obrigatório."),
	origem: z.enum(ORIGENS),
});

function destinoValido(data: { destinoTipo: DestinoTipo; destinoPessoaId: string | null }): boolean {
	return data.destinoTipo !== "educador" || (data.destinoPessoaId !== null && data.destinoPessoaId.length > 0);
}

const DESTINO_ISSUE: { message: string; path: string[] } = {
	message: "Selecione o educador de destino.",
	path: ["destinoPessoaId"],
};

export const repasseInputSchema = repasseBaseSchema.refine(destinoValido, DESTINO_ISSUE);

export type RepasseInput = z.infer<typeof repasseInputSchema>;

export interface Repasse {
	id: string;
	destinoTipo: DestinoTipo;
	destinoPessoaId: string | null;
	turmaId: string | null;
	valorCentavos: number;
	vencimento: string | null;
	status: RepasseStatus;
	origem: Origem;
	ativo: boolean;
}
