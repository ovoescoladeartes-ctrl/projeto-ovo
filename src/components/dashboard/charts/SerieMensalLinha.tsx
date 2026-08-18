"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

import { ChartTooltipSimples } from "./ChartTooltipSimples";

const chartConfig = {} satisfies ChartConfig;

interface PontoMensal {
	label: string;
	valor: number;
}

interface SerieMensalLinhaProps {
	dados: PontoMensal[];
	formatarValor: (valor: number) => string;
	nomeSerie: string;
	cor?: string;
}

/** Linha mensal genérica — curva acumulada (ex.: alunos ativos por período), diferente da barra usada pra totais discretos por mês. */
export function SerieMensalLinha({ dados, formatarValor, nomeSerie, cor = "var(--chart-1)" }: SerieMensalLinhaProps): React.ReactElement {
	return (
		<div className="overflow-x-auto">
			<div style={{ minWidth: Math.max(dados.length * 44, 280) }}>
				<ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
					<LineChart data={dados} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
						<CartesianGrid vertical={false} stroke="var(--border)" />
						<XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
						<YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} width={40} allowDecimals={false} />
						<ChartTooltip
							cursor={{ stroke: "var(--border)" }}
							content={({ active, label, payload }) => (
								<ChartTooltipSimples
									active={active}
									label={label as string}
									formatarValor={formatarValor}
									payload={payload?.map((item) => ({ value: item.value as number, name: nomeSerie }))}
								/>
							)}
						/>
						<Line
							dataKey="valor"
							stroke={cor}
							strokeWidth={2}
							dot={{ r: 4, fill: cor, stroke: "var(--card)", strokeWidth: 2 }}
							activeDot={{ r: 5 }}
						/>
					</LineChart>
				</ChartContainer>
			</div>
		</div>
	);
}
