interface ChartTooltipPayloadItem {
	value: number | string;
	name?: string;
	color?: string;
}

interface ChartTooltipSimplesProps {
	active?: boolean;
	payload?: ChartTooltipPayloadItem[];
	label?: string;
	formatarValor: (valor: number) => string;
}

/**
 * Tooltip minimalista, escrito à mão em vez do `ChartTooltipContent` genérico do shadcn — o
 * `formatter` daquele componente assume controle do layout da linha inteira (ver
 * `src/components/ui/chart.tsx`), o que tornava a formatação de moeda mais indireta do que só
 * escrever o layout aqui, já nos tokens do design system (`bg-card`/`border-border`).
 */
export function ChartTooltipSimples({ active, payload, label, formatarValor }: ChartTooltipSimplesProps): React.ReactElement | null {
	if (active !== true || !payload || payload.length === 0) {
		return null;
	}

	return (
		<div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
			{label !== undefined ? <p className="font-medium text-foreground">{label}</p> : null}
			<div className="mt-1 space-y-1">
				{payload.map((item, index) => (
					<div key={`${item.name ?? "valor"}-${index}`} className="flex items-center gap-2">
						{item.color !== undefined ? (
							<span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
						) : null}
						{item.name !== undefined ? <span className="text-muted-foreground">{item.name}</span> : null}
						<span className="ml-auto font-medium tabular-nums text-foreground">{formatarValor(Number(item.value))}</span>
					</div>
				))}
			</div>
		</div>
	);
}
