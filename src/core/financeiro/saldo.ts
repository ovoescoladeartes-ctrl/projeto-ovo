import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import type { Repasse } from "@/core/financeiro/repasses/schema";
import { formatarAnoMes } from "@/core/financeiro/shared";

/**
 * Saldo vivo = confirmado − repasses pagos. Wix retido NÃO entra (decisão fechada v1) —
 * só o must-have dos 3 KPIs do PRD. Calculado em memória a partir das listas que a página
 * do Caixa já busca para o histórico — sem query nem índice adicional. `AggregateQuery.sum()`
 * do Admin SDK exige índice composto mesmo com um único filtro de igualdade (diferente de
 * queries normais), o que geraria fricção desnecessária para uma coleção desse tamanho.
 */
export function calcularSaldoVivo(
	recebimentos: Pick<Recebimento, "status" | "valorCentavos">[],
	repasses: Pick<Repasse, "status" | "valorCentavos">[],
): number {
	const recebido = recebimentos
		.filter((recebimento) => recebimento.status === "confirmado")
		.reduce((total, recebimento) => total + recebimento.valorCentavos, 0);

	const pago = repasses
		.filter((repasse) => repasse.status === "pago")
		.reduce((total, repasse) => total + repasse.valorCentavos, 0);

	return recebido - pago;
}

export function calcularRecebidoNoMes(recebimentos: Pick<Recebimento, "status" | "dataRecebimento" | "valorCentavos">[]): number {
	const anoMes = formatarAnoMes(new Date());

	return recebimentos
		.filter(
			(recebimento) =>
				recebimento.status === "confirmado" && (recebimento.dataRecebimento ?? "").slice(0, 7) === anoMes,
		)
		.reduce((total, recebimento) => total + recebimento.valorCentavos, 0);
}

export function contarRepassesPendentes(repasses: Pick<Repasse, "status">[]): number {
	return repasses.filter((repasse) => repasse.status === "pendente").length;
}

/**
 * Pendentes com vencimento dentro da janela (inclui atrasados — vencimento no passado
 * também é "a vencer" no sentido de precisar de atenção), ordenado do mais urgente
 * (vencimento mais próximo/já vencido) pro mais distante.
 */
export function listarRepassesAVencer<T extends Pick<Repasse, "status" | "vencimento">>(
	repasses: T[],
	diasJanela = 7,
	agora: Date = new Date(),
): T[] {
	const limite = new Date(agora);
	limite.setDate(limite.getDate() + diasJanela);

	return repasses
		.filter((repasse) => repasse.status === "pendente" && repasse.vencimento !== null && new Date(repasse.vencimento) <= limite)
		.sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""));
}
