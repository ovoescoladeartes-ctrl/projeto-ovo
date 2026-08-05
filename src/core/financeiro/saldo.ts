import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import type { Repasse } from "@/core/financeiro/repasses/schema";

function anoMesAtual(): string {
	const agora = new Date();
	return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Saldo vivo = confirmado − repasses pagos. Wix retido NÃO entra (decisão fechada v1) —
 * só o must-have dos 3 KPIs do PRD. Calculado em memória a partir das listas que a página
 * do Caixa já busca para o histórico — sem query nem índice adicional. `AggregateQuery.sum()`
 * do Admin SDK exige índice composto mesmo com um único filtro de igualdade (diferente de
 * queries normais), o que geraria fricção desnecessária para uma coleção desse tamanho.
 */
export function calcularSaldoVivo(recebimentos: Recebimento[], repasses: Repasse[]): number {
	const recebido = recebimentos
		.filter((recebimento) => recebimento.status === "confirmado")
		.reduce((total, recebimento) => total + recebimento.valorCentavos, 0);

	const pago = repasses
		.filter((repasse) => repasse.status === "pago")
		.reduce((total, repasse) => total + repasse.valorCentavos, 0);

	return recebido - pago;
}

export function calcularRecebidoNoMes(recebimentos: Recebimento[]): number {
	const anoMes = anoMesAtual();

	return recebimentos
		.filter(
			(recebimento) =>
				recebimento.status === "confirmado" && (recebimento.dataRecebimento ?? "").slice(0, 7) === anoMes,
		)
		.reduce((total, recebimento) => total + recebimento.valorCentavos, 0);
}

export function contarRepassesPendentes(repasses: Repasse[]): number {
	return repasses.filter((repasse) => repasse.status === "pendente").length;
}
