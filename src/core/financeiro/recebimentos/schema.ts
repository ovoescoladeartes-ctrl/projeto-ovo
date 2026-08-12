import { z } from "zod";

import { ORIGENS, type Origem } from "@/core/financeiro/shared";

export const FORMAS_PAGAMENTO = ["pix", "dinheiro", "cartao", "transferencia", "boleto", "outro"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const RECEBIMENTO_STATUS = ["confirmado", "pendente", "cancelado"] as const;
export type RecebimentoStatus = (typeof RECEBIMENTO_STATUS)[number];

export const recebimentoInputSchema = z.object({
	pessoaId: z.string().min(1, "Selecione uma pessoa."),
	turmaId: z.string().nullable().default(null),
	matriculaId: z.string().nullable().default(null),
	valorCentavos: z.number().int().positive("Valor deve ser maior que zero."),
	formaPagamento: z.enum(FORMAS_PAGAMENTO),
	origem: z.enum(ORIGENS),
	status: z.enum(RECEBIMENTO_STATUS),
	dataRecebimento: z.string().min(1, "Data é obrigatória."),
});

export type RecebimentoInput = z.infer<typeof recebimentoInputSchema>;

export interface Recebimento {
	id: string;
	pessoaId: string;
	turmaId: string | null;
	matriculaId: string | null;
	valorCentavos: number;
	formaPagamento: FormaPagamento;
	origem: Origem;
	status: RecebimentoStatus;
	dataRecebimento: string | null;
	ativo: boolean;
	/** Chave composta de idempotência do sync Wix — um order com múltiplos itens vira múltiplos Recebimentos. */
	wixOrderId: string | null;
	wixLineItemId: string | null;
}
