"use client";

import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

import { ChartTooltipSimples } from "./ChartTooltipSimples";

const chartConfig = {} satisfies ChartConfig;

// Rampa de cinza fixa (regra 29 do design.md) — mais escuro pro maior valor (1ª fatia), mais
// claro pro menor/"Outras" (última). Nunca cor, nunca atribuída fora dessa ordem.
const RAMPA_CINZA = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--chart-6)",
];

interface ItemDonut {
	chave: string;
	label: string;
	valor: number;
}

interface DonutRankingProps {
	itens: ItemDonut[];
	formatarValor: (valor: number) => string;
	vazio?: string;
}

/**
 * Gráfico de rosca pra ranking/composição (ex.: turmas com mais alunos/receita) — fatias em
 * ordem de rampa de cinza (maior pro menor), com rótulo direto na legenda embaixo (nunca só no
 * tooltip, ver dataviz skill), já que 2+ fatias precisam de identidade que não dependa só do tom.
 */
export function DonutRanking({ itens, formatarValor, vazio = "Sem dados ainda." }: DonutRankingProps): React.ReactElement {
	const total = itens.reduce((soma, item) => soma + item.valor, 0);

	if (total === 0) {
		return <p className="py-10 text-center text-xs text-muted-foreground">{vazio}</p>;
	}

	return (
		<div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
			<ChartContainer config={chartConfig} className="aspect-square w-full max-w-[200px] shrink-0">
				<PieChart>
					<ChartTooltip
						content={({ active, payload }) => (
							<ChartTooltipSimples
								active={active}
								formatarValor={formatarValor}
								payload={payload?.map((item) => ({
									value: item.value as number,
									name: item.name as string,
									color: (item.payload as { fill?: string }).fill,
								}))}
							/>
						)}
					/>
					<Pie data={itens} dataKey="valor" nameKey="label" innerRadius={52} outerRadius={88} paddingAngle={2} strokeWidth={2} stroke="var(--card)">
						{itens.map((item, index) => (
							<Cell key={item.chave} fill={RAMPA_CINZA[index % RAMPA_CINZA.length]} />
						))}
					</Pie>
				</PieChart>
			</ChartContainer>

			<div className="w-full min-w-0 flex-1 space-y-1.5">
				{itens.map((item, index) => (
					<div key={item.chave} className="flex items-center gap-2 text-xs">
						<span
							className="h-2 w-2 shrink-0 rounded-[2px]"
							style={{ backgroundColor: RAMPA_CINZA[index % RAMPA_CINZA.length] }}
						/>
						<span className="min-w-0 flex-1 truncate text-muted-foreground" title={item.label}>
							{item.label}
						</span>
						<span className="shrink-0 font-medium tabular-nums text-foreground">{formatarValor(item.valor)}</span>
						<span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
							{Math.round((item.valor / total) * 100)}%
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
