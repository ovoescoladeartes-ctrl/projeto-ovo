import { z } from "zod";

import type { Origem } from "@/core/shared/origem";

export const PESSOA_TIPOS = ["aluno", "colaborador"] as const;
export type PessoaTipo = (typeof PESSOA_TIPOS)[number];

export const ALUNO_STATUS = ["lead", "matriculado"] as const;
export const COLABORADOR_STATUS = ["ativo", "banco_talentos"] as const;

export const pessoaInputSchema = z.discriminatedUnion("tipo", [
	z.object({
		tipo: z.literal("aluno"),
		nome: z.string().trim().min(1, "Nome é obrigatório."),
		status: z.enum(ALUNO_STATUS),
	}),
	z.object({
		tipo: z.literal("colaborador"),
		nome: z.string().trim().min(1, "Nome é obrigatório."),
		status: z.enum(COLABORADOR_STATUS),
	}),
]);

export type PessoaInput = z.infer<typeof pessoaInputSchema>;

export interface Pessoa {
	id: string;
	tipo: PessoaTipo;
	nome: string;
	status: string;
	ativo: boolean;
	/** Preenchido só pela conversão contato → pessoa da fase 4; nulo em cadastro manual. */
	criadoViaContatoId: string | null;
	criadoEm: string | null;
	/** Campos abaixo: nulos em Pessoas cadastradas antes da integração Wix existir. */
	email: string | null;
	telefone: string | null;
	wixContactId: string | null;
	origem: Origem;
}
