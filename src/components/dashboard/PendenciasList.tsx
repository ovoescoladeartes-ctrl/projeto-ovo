import { Badge } from "@/components/ui/badge";
import type { PendenciaItem } from "@/core/dashboard/types";

import { PendenciaRow } from "./PendenciaRow";

interface PendenciasListProps {
	items: PendenciaItem[];
}

export function PendenciasList({ items }: PendenciasListProps): React.ReactElement {
	return (
		<section>
			<div className="mb-3 flex items-center gap-2">
				<h2 className="text-base font-semibold text-foreground">Pendências</h2>
				<Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">{items.length}</Badge>
			</div>
			<div className="divide-y divide-border overflow-hidden rounded-xl border border-l-4 border-border border-l-foreground bg-card">
				{items.map((item) => (
					<PendenciaRow key={item.id} icon={item.icon} titulo={item.titulo} meta={item.meta} />
				))}
			</div>
		</section>
	);
}
