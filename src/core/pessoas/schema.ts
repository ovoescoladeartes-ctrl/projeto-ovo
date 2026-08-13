import { z } from "zod";

import type { Origem } from "@/core/shared/origem";

export const ALUNO_STATUS = ["lead", "matriculado"] as const;
export type StatusAluno = (typeof ALUNO_STATUS)[number];

export const PROFESSOR_STATUS = ["banco_talentos", "ativo"] as const;
export type StatusProfessor = (typeof PROFESSOR_STATUS)[number];

/**
 * Papel duplo: uma pessoa pode ser aluno e professor ao mesmo tempo — por isso não é mais uma
 * union discriminada por um único `tipo`. Cada papel carrega seu próprio status/número, sem
 * misturar. Marcar um papel só abre a possibilidade (status inicial "lead"/"banco_talentos");
 * status e número nunca são aceitos como input aqui — são sempre derivados (ver
 * `recalcularStatusProfessor` e `matricular`).
 */
const campoOpcional = z
	.string()
	.trim()
	.transform((valor) => (valor === "" ? null : valor))
	.nullable()
	.optional();

/** Vazio vira `null` antes de validar — só valida formato de email quando algo foi digitado. */
const campoEmailOpcional = z.preprocess(
	(valor) => (typeof valor === "string" && valor.trim() === "" ? null : valor),
	z.string().trim().email("Email inválido.").nullable().optional(),
);

export const pessoaInputSchema = z
	.object({
		nome: z.string().trim().min(1, "Nome é obrigatório."),
		ehAluno: z.boolean(),
		ehProfessor: z.boolean(),
		interesses: z.array(z.string()).default([]),
		email: campoEmailOpcional,
		telefone: campoOpcional,
	})
	.refine((dados) => dados.ehAluno || dados.ehProfessor, {
		message: "Marque pelo menos um papel (Aluno ou Professor).",
		path: ["ehAluno"],
	});

export type PessoaInput = z.infer<typeof pessoaInputSchema>;

export interface Pessoa {
	id: string;
	nome: string;
	ehAluno: boolean;
	ehProfessor: boolean;
	/** `null` enquanto a pessoa nunca foi aluno — depois de definido, nunca volta a `null`. */
	statusAluno: StatusAluno | null;
	/** `null` enquanto a pessoa nunca foi professor — depois de definido, nunca volta a `null`. */
	statusProfessor: StatusProfessor | null;
	ativo: boolean;
	/** Preenchido só pela conversão contato → pessoa da fase 4; nulo em cadastro manual. */
	criadoViaContatoId: string | null;
	criadoEm: string | null;
	/** Assuntos de interesse (fonte de verdade: coleção `interesses`) — independente de Matrícula real. */
	interesses: string[];
	email: string | null;
	telefone: string | null;
	/**
	 * Identificador legível (`A-AAAA-NNNN`), atribuído uma única vez na primeira Matrícula real.
	 * Somente leitura na UI — não há action de edição (ver `numeroMatricula.ts`).
	 */
	numeroMatriculaAluno: string | null;
	/**
	 * Identificador legível (`P-AAAA-NNNN`), atribuído uma única vez ao se tornar educador de
	 * alguma Turma ativa pela primeira vez. Somente leitura na UI.
	 */
	numeroMatriculaProfessor: string | null;
	/** Nulo em Pessoas cadastradas antes da integração Wix existir. */
	wixContactId: string | null;
	origem: Origem;
}
