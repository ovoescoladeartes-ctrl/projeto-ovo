import { chaveSemana, formatarIntervaloSemana, segundaFeiraDe } from "@/core/financeiro/ritual/semana";
import { formatarAnoMes } from "@/core/financeiro/shared";

const MESES_PT = [
	"Janeiro",
	"Fevereiro",
	"Março",
	"Abril",
	"Maio",
	"Junho",
	"Julho",
	"Agosto",
	"Setembro",
	"Outubro",
	"Novembro",
	"Dezembro",
];

export const chavePeriodo = formatarAnoMes;

/** `chave` sempre já validada por `chavePeriodoValida` antes de chegar aqui — `slice` evita o
 * `undefined` que destructuring de array causaria com `noUncheckedIndexedAccess`. */
function partesPeriodo(chave: string): { ano: number; mes: number } {
	return { ano: Number(chave.slice(0, 4)), mes: Number(chave.slice(5, 7)) };
}

/**
 * Chave `yyyy-MM` válida: formato certo, mês entre 01-12 e ano num intervalo plausível — sem isso,
 * `?periodo=2026-13` passava e `formatarPeriodo`/`semanasDoPeriodo` rolavam silenciosamente pra um
 * período fabricado (mês em branco, semanas de um mês seguinte inexistente na URL).
 */
export function chavePeriodoValida(valor: string): boolean {
	if (!/^\d{4}-\d{2}$/.test(valor)) {
		return false;
	}
	const { ano, mes } = partesPeriodo(valor);
	return mes >= 1 && mes <= 12 && ano >= 1900;
}

export function formatarPeriodo(chave: string): string {
	const { ano, mes } = partesPeriodo(chave);
	return `${MESES_PT[mes - 1] ?? ""} ${ano}`;
}

export interface SemanaDoPeriodo {
	chaveSemana: string;
	label: string;
}

/**
 * Semanas "do mês" = toda segunda-feira cuja própria data cai dentro do mês (mesma chave usada
 * pelo Ritual de Segunda — segunda a domingo). Isso normalmente rende 4 segundas por mês, o que
 * bate com o resumo "Semanas Fechadas" da tela, mas o intervalo exibido (seg-dom) não é
 * necessariamente "01/mm a 07/mm" como no Figma quando o mês não começa numa segunda — desvio
 * deliberado: alinhar com a chave real do Ritual (mesma fonte de verdade) importa mais que bater
 * o rótulo literal do Figma.
 */
export function semanasDoPeriodo(chave: string): SemanaDoPeriodo[] {
	const { ano, mes } = partesPeriodo(chave);
	const primeiroDia = new Date(ano, mes - 1, 1);
	const ultimoDia = new Date(ano, mes, 0);

	const semanas: SemanaDoPeriodo[] = [];
	let cursor = segundaFeiraDe(primeiroDia);
	if (cursor < primeiroDia) {
		cursor = new Date(cursor);
		cursor.setDate(cursor.getDate() + 7);
	}

	while (cursor <= ultimoDia) {
		semanas.push({ chaveSemana: chaveSemana(cursor), label: formatarIntervaloSemana(cursor) });
		cursor = new Date(cursor);
		cursor.setDate(cursor.getDate() + 7);
	}

	return semanas;
}
