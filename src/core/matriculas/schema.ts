import { z } from "zod";

export const MATRICULA_STATUS = ["ativa", "encerrada"] as const;
export type MatriculaStatus = (typeof MATRICULA_STATUS)[number];

export const matriculaInputSchema = z.object({
	pessoaId: z.string().min(1, "Selecione uma pessoa."),
	turmaId: z.string().min(1, "Selecione uma turma."),
	dataMatricula: z.string().min(1, "Data da matrícula é obrigatória."),
	mensalidadeCombinadaCentavos: z.number().int().nonnegative(),
	motivo: z.string().trim().nullable().default(null),
});

export type MatriculaInput = z.infer<typeof matriculaInputSchema>;

export const matriculaUpdateInputSchema = z.object({
	id: z.string().min(1),
	pessoaId: z.string().min(1),
	mensalidadeCombinadaCentavos: z.number().int().nonnegative(),
	motivo: z.string().trim().nullable().default(null),
});

export type MatriculaUpdateInput = z.infer<typeof matriculaUpdateInputSchema>;

export interface Matricula {
	id: string;
	pessoaId: string;
	turmaId: string;
	dataMatricula: string | null;
	/** Snapshot do valor no momento da matrícula — reajuste de mensalidade da turma não altera matrículas antigas. */
	mensalidadeCombinadaCentavos: number;
	status: MatriculaStatus;
	ativo: boolean;
	/** Só preenchido pelo import CSV (fase 5) — sinaliza que `dataMatricula` é aproximada. */
	observacoes?: string | null;
	/** Texto livre opcional (ex.: "bolsa", "permuta") — só exibido na edição da matrícula, nunca na listagem compacta. */
	motivo: string | null;
}
