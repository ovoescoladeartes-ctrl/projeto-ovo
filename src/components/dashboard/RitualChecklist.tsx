import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RitualChecklistItemData } from "@/core/dashboard/types";

import { RitualChecklistItem } from "./RitualChecklistItem";

interface RitualChecklistProps {
	items: RitualChecklistItemData[];
}

export function RitualChecklist({ items }: RitualChecklistProps): React.ReactElement {
	const concluidos = items.filter((item) => item.concluido).length;

	return (
		<Card>
			<CardHeader className="flex-row items-center gap-2 space-y-0">
				<CardTitle className="text-base">Ritual de segunda</CardTitle>
				<Badge variant="secondary">
					{concluidos}/{items.length} concluídos
				</Badge>
				<Badge variant="outline" className="text-muted-foreground">
					em breve
				</Badge>
			</CardHeader>
			<CardContent className="pt-0">
				{items.map((item) => (
					<RitualChecklistItem key={item.id} label={item.label} concluido={item.concluido} />
				))}
			</CardContent>
		</Card>
	);
}
