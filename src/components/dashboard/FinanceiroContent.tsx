"use client";

import Link from "next/link";

import { RankingHorizontal } from "@/components/dashboard/charts/RankingHorizontal";
import { SerieMensalBarras } from "@/components/dashboard/charts/SerieMensalBarras";
import { ChecklistCustomizadoCard } from "@/components/checklist/ChecklistCustomizadoCard";
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

			{/* Seção "Checklists" com fundo levemente diferente do resto da página, sem borda/sombra
			(item 2 da 5ª rodada de feedback). Dois bugs reais encontrados na investigação:
			(1) `bg-muted/50` é quase idêntico a `--background` (oklch 0.97 vs 0.976, mesma armadilha já
			documentada em docs/design.md pro `--accent`) — trocado por `bg-subtle` (`--surface-hover`,
			#e9e9e4), o token certo pra esse fim. (2) o box não fazia sangria até a borda da página, então
			o padding próprio (`p-6`) somava com o padding da página e desalinhava o conteúdo em relação
			às outras seções — agora sangra com margem negativa que cancela exatamente o padding
			responsivo do layout (`p-6 sm:p-8`, `src/app/(protected)/layout.tsx`) e reaplica o mesmo
			padding por dentro, então o conteúdo cai na mesma posição horizontal de tudo o mais na página
			(a faixa mais abaixo, com `mr-[-1.5rem]`/`pr-6`, continua sangrando só à direita, agora contra
			essa borda em vez da borda da página). */}
			<div className="-mx-6 flex flex-col gap-4 bg-subtle px-6 py-6 sm:-mx-8 sm:px-8">
				{/* Título de seção + "ver tudo", acima do carrossel (padrão Netflix/iFood) — item 4 do feedback de revisão. */}
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-lg font-semibold text-foreground">Checklists</h2>
					<Link href="/checklists?aba=financeiro" className="text-sm font-medium text-primary hover:underline">
						Ver todos os checklists →
					</Link>
				</div>

				{/* Faixa rolável (mobile) / grade (desktop) de checklists — seção 5.1 da spec-checklist-motor.md. */}
				<div className="mr-[-1.5rem] flex snap-x snap-mandatory gap-4 overflow-x-auto pr-6 pb-2 sm:mr-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:pr-0 lg:grid-cols-3">
					{checklistsFinanceiro.map((resumo) => (
						<div key={resumo.id} className="w-[85vw] shrink-0 snap-start sm:w-auto">
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
