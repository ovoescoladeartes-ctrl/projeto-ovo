import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import { gerarJanelaMeses } from "@/core/shared/mesesJanela";

export interface PontoSerieMensal {
	anoMes: string;
	label: string;
	totalCentavos: number;
}

/**
 * Série mensal do recebido confirmado — base do gráfico de tendência da aba Financeiro. Meses sem
 * nenhum recebimento aparecem com total zero (não somem da série), pra não distorcer a leitura de
 * sazonalidade.
 */
export function calcularSerieMensalRecebido(
	recebimentos: Pick<Recebimento, "status" | "dataRecebimento" | "valorCentavos">[],
	meses: number,
	agora: Date,
): PontoSerieMensal[] {
	const pontos: PontoSerieMensal[] = gerarJanelaMeses(meses, agora).map((ponto) => ({ ...ponto, totalCentavos: 0 }));
	const porAnoMes = new Map(pontos.map((ponto) => [ponto.anoMes, ponto]));

	recebimentos
		.filter((recebimento) => recebimento.status === "confirmado" && recebimento.dataRecebimento !== null)
		.forEach((recebimento) => {
			const ponto = porAnoMes.get(recebimento.dataRecebimento!.slice(0, 7));
			if (ponto) {
				ponto.totalCentavos += recebimento.valorCentavos;
			}
		});

	return pontos;
}

export interface RankingTurma {
	turmaId: string | null;
	nome: string;
	totalCentavos: number;
}

/**
 * Ranking de recebido confirmado por turma, maior pro menor. A partir do `topN`+1º lugar, soma
 * tudo em "Outras" (nunca gera uma nova fatia/cor pra cada turma além da rampa de cinza — ver
 * regra 29 do design.md).
 */
export function calcularRecebidoPorTurma(
	recebimentos: Pick<Recebimento, "status" | "turmaId" | "valorCentavos">[],
	turmasNomes: Record<string, string>,
	topN = 5,
): RankingTurma[] {
	const SEM_TURMA = "__sem_turma__";
	const totais = new Map<string, number>();
	recebimentos
		.filter((recebimento) => recebimento.status === "confirmado")
		.forEach((recebimento) => {
			const chave = recebimento.turmaId ?? SEM_TURMA;
			totais.set(chave, (totais.get(chave) ?? 0) + recebimento.valorCentavos);
		});

	const linhas: RankingTurma[] = Array.from(totais.entries())
		.map(([turmaId, totalCentavos]) => ({
			turmaId: turmaId === SEM_TURMA ? null : turmaId,
			nome: turmaId === SEM_TURMA ? "Sem turma" : (turmasNomes[turmaId] ?? "Turma removida"),
			totalCentavos,
		}))
		.sort((a, b) => b.totalCentavos - a.totalCentavos);

	if (linhas.length <= topN) {
		return linhas;
	}

	const outrasTotal = linhas.slice(topN).reduce((soma, linha) => soma + linha.totalCentavos, 0);
	const top = linhas.slice(0, topN);
	if (outrasTotal > 0) {
		top.push({ turmaId: null, nome: "Outras turmas", totalCentavos: outrasTotal });
	}
	return top;
}
