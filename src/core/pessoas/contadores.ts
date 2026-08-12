import type { Pessoa } from "@/core/pessoas/schema";

export function contarAlunosMatriculados(pessoas: Pick<Pessoa, "tipo" | "status" | "ativo">[]): number {
	return pessoas.filter((pessoa) => pessoa.ativo && pessoa.tipo === "aluno" && pessoa.status === "matriculado").length;
}
