import type { ContatoParaExportar } from "./actions";

/** Escapa aspas/vírgula/quebra de linha — cobre os poucos campos exportados aqui. */
function csvField(valor: string): string {
	if (/[",\n]/.test(valor)) {
		return `"${valor.replace(/"/g, '""')}"`;
	}
	return valor;
}

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

export function montarVCard(contatos: ContatoParaExportar[]): string {
	const cartoes = contatos
		.filter((contato) => contato.telefone !== null)
		.map((contato) => {
			const telefone = digitosComPais(contato.telefone ?? "");
			return ["BEGIN:VCARD", "VERSION:3.0", `FN:${contato.nome}`, `TEL;TYPE=CELL:+${telefone}`, "END:VCARD"].join("\n");
		});
	return cartoes.join("\n");
}

export function baixarArquivo(conteudo: string, nomeArquivo: string, tipo: string): void {
	const blob = new Blob([`﻿${conteudo}`], { type: `${tipo};charset=utf-8` });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = nomeArquivo;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
