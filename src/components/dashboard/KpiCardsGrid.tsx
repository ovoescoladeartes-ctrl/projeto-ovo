import type { KpiCardData } from "@/core/dashboard/types";

import { KpiCard } from "./KpiCard";

interface KpiCardsGridProps {
	items: KpiCardData[];
}

export function KpiCardsGrid({ items }: KpiCardsGridProps): React.ReactElement {
	// Nunca mais colunas que itens — grid fixo em 2/4 colunas com menos itens que isso deixa
	// coluna(s) vazia(s) no desktop (bug real: aba Comunicação com 1 KPI só sobrava meia linha em
	// branco num grid-cols-2). Sempre casa a contagem exata de colunas com a contagem de itens.
	const colsClass =
		items.length >= 4 ? "sm:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1";

	return (
		<div className={`grid grid-cols-1 gap-4 ${colsClass}`}>
			{items.map((item) => (
				<KpiCard key={item.label} {...item} />
			))}
		</div>
	);
}
