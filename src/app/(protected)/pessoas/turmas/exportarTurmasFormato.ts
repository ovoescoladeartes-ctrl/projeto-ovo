import { csvField } from "@/lib/csv";

import type { TurmaParaExportar } from "./actions";

export function montarCsvTurmas(turmas: TurmaParaExportar[]): string {
	const colunas: { chave: keyof TurmaParaExportar; titulo: string }[] = [
		{ chave: "nome", titulo: "Nome" },
		{ chave: "tipo", titulo: "Tipo" },
		{ chave: "assunto", titulo: "Assunto" },
		{ chave: "mensalidade", titulo: "Mensalidade" },
		{ chave: "repasse", titulo: "Repasse" },
		{ chave: "inicio", titulo: "Início" },
		{ chave: "fim", titulo: "Fim" },
		{ chave: "vagasOcupadas", titulo: "Vagas ocupadas" },
		{ chave: "capacidade", titulo: "Capacidade" },
		{ chave: "educador", titulo: "Educador" },
	];
	const linhas = turmas.map((turma) => colunas.map((coluna) => csvField(String(turma[coluna.chave] ?? ""))).join(","));
	return [colunas.map((coluna) => csvField(coluna.titulo)).join(","), ...linhas].join("\n");
}
