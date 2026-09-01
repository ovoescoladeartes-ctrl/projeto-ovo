import { csvField } from "@/lib/csv";

import type { ContatoParaExportar } from "./actions";

export function montarCsv(contatos: ContatoParaExportar[]): string {
	const colunas: { chave: keyof ContatoParaExportar; titulo: string }[] = [
		{ chave: "nome", titulo: "Nome" },
		{ chave: "email", titulo: "Email" },
		{ chave: "telefone", titulo: "Telefone" },
		{ chave: "tipo", titulo: "Tipo" },
		{ chave: "status", titulo: "Status" },
		{ chave: "turmas", titulo: "Turma(s)" },
		{ chave: "criadoEm", titulo: "Cadastrado em" },
	];
	const linhas = contatos.map((contato) => colunas.map((coluna) => csvField(String(contato[coluna.chave] ?? ""))).join(","));
	return [colunas.map((coluna) => csvField(coluna.titulo)).join(","), ...linhas].join("\n");
}

/** Heurística simples: mantém só dígitos, prefixa 55 (Brasil) se ainda não começar com ele. */
export function digitosComPais(telefone: string): string {
	const digitos = telefone.replace(/\D/g, "");
	return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

