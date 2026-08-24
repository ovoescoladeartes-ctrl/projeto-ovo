/**
 * Utils de data sem dependência externa, mesmo estilo de `saldo.ts` — "semana" aqui é sempre
 * segunda a domingo (ISO), identificada pela data da segunda-feira em `yyyy-MM-dd`.
 */

export function segundaFeiraDe(data: Date): Date {
	const resultado = new Date(data.getFullYear(), data.getMonth(), data.getDate());
	const diaSemana = resultado.getDay(); // 0 = domingo .. 6 = sábado
	const offset = diaSemana === 0 ? -6 : 1 - diaSemana;
	resultado.setDate(resultado.getDate() + offset);
	return resultado;
}

export function chaveSemana(segunda: Date): string {
	return `${segunda.getFullYear()}-${String(segunda.getMonth() + 1).padStart(2, "0")}-${String(segunda.getDate()).padStart(2, "0")}`;
}

export function formatarDataCurta(data: Date): string {
	return `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export function formatarIntervaloSemana(segunda: Date): string {
	const domingo = new Date(segunda);
	domingo.setDate(domingo.getDate() + 6);
	return `${formatarDataCurta(segunda)} a ${formatarDataCurta(domingo)}`;
}

export function semanaAnterior(segunda: Date): Date {
	const resultado = new Date(segunda);
	resultado.setDate(resultado.getDate() - 7);
	return resultado;
}

/**
 * Chave `yyyy-MM-dd` válida: formato certo, data que existe de fato (rejeita `2026-02-30`, que o
 * construtor `Date` rolaria silenciosamente pra 02/03) e que cai numa segunda-feira de verdade —
 * a chave vira id literal do doc no Firestore, então um valor fora desses critérios criaria um
 * registro órfão (nunca alcançado pelo fluxo normal, que só gera chaves via `chaveSemana(segundaFeiraDe(...))`).
 */
export function chaveSemanaValida(valor: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
		return false;
	}
	const ano = Number(valor.slice(0, 4));
	const mes = Number(valor.slice(5, 7));
	const dia = Number(valor.slice(8, 10));
	const data = new Date(ano, mes - 1, dia);
	return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia && data.getDay() === 1;
}
