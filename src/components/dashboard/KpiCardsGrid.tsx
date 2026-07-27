import type { KpiCardData } from "@/core/dashboard/types";

import { KpiCard } from "./KpiCard";

interface KpiCardsGridProps {
	items: KpiCardData[];
}

export function KpiCardsGrid({ items }: KpiCardsGridProps): React.ReactElement {
	const colsClass = items.length > 2 ? "sm:grid-cols-4" : "sm:grid-cols-2";

	return (
		<div className={`grid grid-cols-1 gap-4 ${colsClass}`}>
			{items.map((item) => (
				<KpiCard key={item.label} {...item} />
			))}
		</div>
	);
}
