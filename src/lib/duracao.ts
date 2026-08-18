/** Formata dias em texto legível ("2 anos e 3 meses", "5 meses", "menos de 1 mês"). */
export function formatarDuracao(dias: number): string {
	const anos = Math.floor(dias / 365);
	const meses = Math.floor((dias % 365) / 30);

	if (anos === 0 && meses === 0) {
		return "menos de 1 mês";
	}
	if (anos === 0) {
		return `${meses} ${meses === 1 ? "mês" : "meses"}`;
	}
	if (meses === 0) {
		return `${anos} ${anos === 1 ? "ano" : "anos"}`;
	}
	return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
}
