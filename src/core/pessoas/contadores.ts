import type { Pessoa } from "@/core/pessoas/schema";

export function contarAlunosMatriculados(pessoas: Pick<Pessoa, "ehAluno" | "statusAluno" | "ativo">[]): number {
	return pessoas.filter((pessoa) => pessoa.ativo && pessoa.ehAluno && pessoa.statusAluno === "matriculado").length;
}
