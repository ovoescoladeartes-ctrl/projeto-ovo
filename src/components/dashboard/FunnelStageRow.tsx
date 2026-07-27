import type { FunnelStageCount } from "@/core/dashboard/types";

import { FunnelStageCard } from "./FunnelStageCard";

interface FunnelStageRowProps {
	items: FunnelStageCount[];
}

export function FunnelStageRow({ items }: FunnelStageRowProps): React.ReactElement {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
			{items.map((item) => (
				<FunnelStageCard key={item.label} label={item.label} value={item.value} />
			))}
		</div>
	);
}
