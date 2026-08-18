import type { Pessoa } from "@/core/pessoas/schema";

export function contarAlunosMatriculados(pessoas: Pick<Pessoa, "ehAluno" | "statusAluno" | "ativo">[]): number {
	return pessoas.filter((pessoa) => pessoa.ativo && pessoa.ehAluno && pessoa.statusAluno === "matriculado").length;
}

export function contarProfessoresAtivos(pessoas: Pick<Pessoa, "ehProfessor" | "statusProfessor" | "ativo">[]): number {
	return pessoas.filter((pessoa) => pessoa.ativo && pessoa.ehProfessor && pessoa.statusProfessor === "ativo").length;
}
