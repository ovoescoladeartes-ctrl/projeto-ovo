import { z } from "zod";

export const MATRICULA_STATUS = ["ativa", "encerrada"] as const;
export type MatriculaStatus = (typeof MATRICULA_STATUS)[number];

export const matriculaInputSchema = z.object({
	pessoaId: z.string().min(1, "Selecione uma pessoa."),
	turmaId: z.string().min(1, "Selecione uma turma."),
	dataMatricula: z.string().min(1, "Data da matrícula é obrigatória."),
});

export type MatriculaInput = z.infer<typeof matriculaInputSchema>;

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
}
