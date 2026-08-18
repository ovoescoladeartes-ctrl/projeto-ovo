"use client";

import { RankingHorizontal } from "@/components/dashboard/charts/RankingHorizontal";
import { SerieMensalBarras } from "@/components/dashboard/charts/SerieMensalBarras";
import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { PendenciasList } from "@/components/dashboard/PendenciasList";
import { Card } from "@/components/ui/card";
import type { KpiCardData, PendenciaItem } from "@/core/dashboard/types";
import type { PontoSerieMensal, RankingTurma } from "@/core/financeiro/series";
import { formatCentavos, formatCentavosCompacto } from "@/lib/currency";

interface FinanceiroContentProps {
	kpis: KpiCardData[];
	pendencias: PendenciaItem[];
	tendencia: PontoSerieMensal[];
	recebidoPorTurma: RankingTurma[];
}

export function FinanceiroContent({ kpis, pendencias, tendencia, recebidoPorTurma }: FinanceiroContentProps): React.ReactElement {
	return (
		<div className="flex flex-col gap-6">
			<KpiCardsGrid items={kpis} />

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card className="min-w-0 p-5">
					<p className="text-sm font-medium text-foreground">Tendência de recebido</p>
					<p className="mt-1 text-xs text-muted-foreground">Recebimentos confirmados por mês, últimos {tendencia.length} meses.</p>
					<div className="mt-4">
						<SerieMensalBarras
							dados={tendencia.map((ponto) => ({ label: ponto.label, valor: ponto.totalCentavos }))}
							formatarValor={formatCentavos}
							formatarEixo={formatCentavosCompacto}
							nomeSerie="Recebido"
						/>
					</div>
				</Card>

				<Card className="min-w-0 p-5">
					<p className="text-sm font-medium text-foreground">Recebido por turma</p>
					<p className="mt-1 text-xs text-muted-foreground">Confirmado no total geral, top {recebidoPorTurma.length}.</p>
					<div className="mt-4">
						<RankingHorizontal
							itens={recebidoPorTurma.map((linha) => ({
								chave: linha.turmaId ?? linha.nome,
								label: linha.nome,
								valor: linha.totalCentavos,
								cor: "var(--chart-1)",
							}))}
							formatarValor={formatCentavos}
							vazio="Nenhum recebimento confirmado ainda."
						/>
					</div>
				</Card>
			</div>

			<PendenciasList items={pendencias} />
		</div>
	);
}
