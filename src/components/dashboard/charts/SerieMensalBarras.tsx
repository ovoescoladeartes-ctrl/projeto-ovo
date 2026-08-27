"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

import { ChartTooltipSimples } from "./ChartTooltipSimples";

const chartConfig = {} satisfies ChartConfig;

interface PontoMensal {
	label: string;
	valor: number;
}

interface SerieMensalBarrasProps {
	dados: PontoMensal[];
	formatarValor: (valor: number) => string;
	formatarEixo?: (valor: number) => string;
	nomeSerie: string;
	cor?: string;
}

/** Gráfico de barras mensal genérico (dinheiro ou contagem) — base compartilhada por Tendência de recebido (Caixa) e os dois gráficos de série da aba Geral. */
export function SerieMensalBarras({
	dados,
	formatarValor,
	formatarEixo,
	nomeSerie,
	cor = "var(--chart-1)",
}: SerieMensalBarrasProps): React.ReactElement {
	// Abaixo de `sm` (celular), sem largura mínima forçada — o gráfico compacta pra caber na
	// tela toda, sem rolagem horizontal. A partir de `sm` a largura mínima por ponto garante
	// legibilidade e, quando a coluna disponível for menor que isso, o próprio `overflow-x-auto`
	// permite rolar (comportamento esperado em telas maiores com muitos pontos).
	return (
		<div className="overflow-x-auto">
			<div
				className="sm:min-w-[var(--chart-min-w)]"
				style={{ "--chart-min-w": `${Math.max(dados.length * 44, 280)}px` } as React.CSSProperties}
			>
				<ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
					<BarChart data={dados} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
						<CartesianGrid vertical={false} stroke="var(--border)" />
						<XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
						<YAxis
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							fontSize={12}
							width={48}
							allowDecimals={false}
							tickFormatter={formatarEixo ?? ((valor: number) => String(valor))}
						/>
						<ChartTooltip
							cursor={{ fill: "var(--muted)" }}
							content={({ active, label, payload }) => (
								<ChartTooltipSimples
									active={active}
									label={label as string}
									formatarValor={formatarValor}
									payload={payload?.map((item) => ({ value: item.value as number, name: nomeSerie }))}
								/>
							)}
						/>
						<Bar dataKey="valor" fill={cor} radius={[4, 4, 0, 0]} maxBarSize={24} />
					</BarChart>
				</ChartContainer>
			</div>
		</div>
	);
}
