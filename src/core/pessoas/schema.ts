import { z } from "zod";

export const PESSOA_TIPOS = ["aluno", "colaborador"] as const;
export type PessoaTipo = (typeof PESSOA_TIPOS)[number];

export const ALUNO_STATUS = ["lead", "matriculado"] as const;
export const COLABORADOR_STATUS = ["ativo", "banco_talentos"] as const;

export const pessoaInputSchema = z.discriminatedUnion("tipo", [
	z.object({
		tipo: z.literal("aluno"),
		nome: z.string().trim().min(1, "Nome é obrigatório."),
		status: z.enum(ALUNO_STATUS),
		interesses: z.array(z.string()).default([]),
	}),
	z.object({
		tipo: z.literal("colaborador"),
		nome: z.string().trim().min(1, "Nome é obrigatório."),
		status: z.enum(COLABORADOR_STATUS),
		interesses: z.array(z.string()).default([]),
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
	/** Assuntos de interesse (fonte de verdade: coleção `interesses`) — independente de Matrícula real. */
	interesses: string[];
	/**
	 * Identificador legível (`AAAA-NNNN`), atribuído uma única vez na primeira Matrícula real.
	 * Somente leitura na UI — não há action de edição (ver `numeroMatricula.ts`).
	 */
	numeroMatricula: string | null;
}
