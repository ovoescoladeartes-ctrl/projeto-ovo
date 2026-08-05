import { z } from "zod";

export const MENSAGEM_CATEGORIAS = ["duracao", "valor", "nivel", "faixa_etaria"] as const;
export type MensagemCategoria = (typeof MENSAGEM_CATEGORIAS)[number];

export const mensagemInputSchema = z.object({
	categoria: z.enum(MENSAGEM_CATEGORIAS),
	titulo: z.string().trim().min(1, "Título é obrigatório."),
	texto: z.string().trim().min(1, "Texto é obrigatório."),
});

export type MensagemInput = z.infer<typeof mensagemInputSchema>;

export interface Mensagem {
	id: string;
	categoria: MensagemCategoria;
	titulo: string;
	texto: string;
	ativo: boolean;
}
