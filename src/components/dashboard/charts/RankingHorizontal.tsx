interface ItemRankingHorizontal {
	chave: string;
	label: string;
	valor: number;
	/** Cor fixa por entidade (categórica) ou a mesma cor em toda a lista (sequencial/magnitude) — nunca atribuída por posição no ranking. */
	cor: string;
}

interface RankingHorizontalProps {
	itens: ItemRankingHorizontal[];
	formatarValor: (valor: number) => string;
	vazio?: string;
}

/**
 * Ranking horizontal (barra + rótulo direto), usado tanto pra "compare magnitude" (uma cor só,
 * ex. recebido por turma) quanto pra composição categórica (uma cor por categoria, ex. origem/
 * forma de pagamento) — a diferença é só em qual `cor` cada item recebe, resolvido por quem chama.
 * Rótulo de valor sempre visível (nunca só no hover), então nenhum dado fica preso a um tooltip.
 */
export function RankingHorizontal({ itens, formatarValor, vazio = "Sem dados no período." }: RankingHorizontalProps): React.ReactElement {
	if (itens.length === 0) {
		return <p className="py-6 text-center text-xs text-muted-foreground">{vazio}</p>;
	}

	const maior = Math.max(...itens.map((item) => item.valor), 1);

	return (
		<div className="space-y-2.5">
			{itens.map((item) => (
				<div key={item.chave} className="flex items-center gap-3">
					<span className="w-1/3 shrink-0 truncate text-xs text-muted-foreground" title={item.label}>
						{item.label}
					</span>
					<div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full"
							style={{ width: `${Math.max((item.valor / maior) * 100, item.valor > 0 ? 2 : 0)}%`, backgroundColor: item.cor }}
						/>
					</div>
					<span className="shrink-0 text-right text-xs font-medium tabular-nums text-foreground">{formatarValor(item.valor)}</span>
				</div>
			))}
		</div>
	);
}
