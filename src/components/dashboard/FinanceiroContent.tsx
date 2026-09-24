"use client";

import Link from "next/link";

import { RankingHorizontal } from "@/components/dashboard/charts/RankingHorizontal";
import { SerieMensalBarras } from "@/components/dashboard/charts/SerieMensalBarras";
import { ChecklistCustomizadoCard } from "@/components/checklist/ChecklistCustomizadoCard";
import { FAIXA_CHECKLISTS, ITEM_FAIXA_CHECKLISTS } from "@/components/checklist/gradeChecklists";
import { ChecklistFechamento } from "@/components/dashboard/ChecklistFechamento";
import { ChecklistFinanceiro } from "@/components/dashboard/ChecklistFinanceiro";
import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { Card } from "@/components/ui/card";
import type { ChecklistItem, ChecklistResumo } from "@/core/checklist/schema";
import type { KpiCardData } from "@/core/dashboard/types";
import type { FechamentoConsolidado } from "@/core/financeiro/fechamento/schema";
import type { PendenciaAcionavel } from "@/core/financeiro/pendencias/schema";
import type { RitualSemana, RitualPendenciaHerdada } from "@/core/financeiro/ritual/schema";
import type { PontoSerieMensal, RankingTurma } from "@/core/financeiro/series";
import { formatCentavos, formatCentavosCompacto } from "@/lib/currency";

interface FinanceiroContentProps {
	kpis: KpiCardData[];
	tendencia: PontoSerieMensal[];
	recebidoPorTurma: RankingTurma[];
	ritual: RitualSemana;
	pendenciasAcionaveis: PendenciaAcionavel[];
	pendenciasHerdadas: RitualPendenciaHerdada[];
	fechamento: FechamentoConsolidado;
	/** Ritual + Fechamento + customizados da área, já ordenados por pin+score e sem os arquivados (seção 3/6 da spec-checklist-motor.md). */
	checklistsFinanceiro: ChecklistResumo[];
	/** Itens dos checklists customizados, indexados pelo `id` do resumo — só os customizados aparecem aqui (Ritual/Fechamento têm seus próprios props já existentes acima). */
	itensChecklistsCustomizados: Record<string, ChecklistItem[]>;
}

export function FinanceiroContent({
	kpis,
	tendencia,
	recebidoPorTurma,
	ritual,
	pendenciasAcionaveis,
	pendenciasHerdadas,
	fechamento,
	checklistsFinanceiro,
	itensChecklistsCustomizados,
}: FinanceiroContentProps): React.ReactElement {
	return (
		<div className="flex flex-col gap-6">
			<KpiCardsGrid items={kpis} />

			{/* Seção "Checklists" sem fundo/borda própria — se integra ao resto do dashboard, só
			separada por espaçamento vertical (o `gap-6` do container pai), igual às outras seções da
			página (item 1 da 8ª rodada de feedback: o fundo destacado e o título grande competiam
			visualmente em vez de se integrar). Título no mesmo estilo de "Tendência de recebido"/
			"Recebido por turma" logo abaixo (`text-sm font-medium text-foreground`), copiado do código
			real dessas seções, não um valor novo. */}
			<div className="flex flex-col gap-4">
				{/* Título de seção + "ver tudo", acima do carrossel (padrão Netflix/iFood) — item 4 do feedback de revisão. */}
				<div className="flex items-center justify-between gap-2">
					<p className="text-sm font-medium text-foreground">Checklists</p>
					<Link href="/checklists?aba=financeiro" className="text-sm font-medium text-primary hover:underline">
						Ver todos os checklists →
					</Link>
				</div>

				{/* Faixa de checklists (seção 5.1 da spec-checklist-motor.md): lado a lado quando cabe, rolagem horizontal quando não — nunca empilhada. Ver `FAIXA_CHECKLISTS`. */}
				<div className={FAIXA_CHECKLISTS}>
					{checklistsFinanceiro.map((resumo) => (
						<div key={resumo.id} className={ITEM_FAIXA_CHECKLISTS}>
							{resumo.id === "financeiro-ritual" ? (
								<ChecklistFinanceiro
									resumo={resumo}
									semana={ritual.semana}
									passosRitual={ritual.itens}
									pendenciasAcionaveis={pendenciasAcionaveis}
									pendenciasHerdadas={pendenciasHerdadas}
								/>
							) : resumo.id === "financeiro-fechamento" ? (
								<ChecklistFechamento resumo={resumo} fechamento={fechamento} />
							) : (
								<ChecklistCustomizadoCard resumo={resumo} itens={itensChecklistsCustomizados[resumo.id] ?? []} />
							)}
						</div>
					))}
				</div>
			</div>

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
		</div>
	);
}
