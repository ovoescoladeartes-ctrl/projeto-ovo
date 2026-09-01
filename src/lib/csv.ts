/** Escapa aspas/vírgula/quebra de linha — usado por todo exportador de CSV do app. */
export function csvField(valor: string): string {
	if (/[",\n]/.test(valor)) {
		return `"${valor.replace(/"/g, '""')}"`;
	}
	return valor;
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
