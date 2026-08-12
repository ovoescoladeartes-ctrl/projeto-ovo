/** Remove acentos e normaliza caixa — usado pra comparação de nome em busca/filtro (não é Server Action). */
export function normalizar(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}
