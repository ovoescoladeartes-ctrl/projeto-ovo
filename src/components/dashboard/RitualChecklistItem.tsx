import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { RitualChecklistItemData } from "@/core/dashboard/types";

type RitualChecklistItemProps = Omit<RitualChecklistItemData, "id">;

export function RitualChecklistItem({
	label,
	concluido,
}: RitualChecklistItemProps): React.ReactElement {
	return (
		<div className="flex items-center gap-3 py-1.5">
			<Checkbox checked={concluido} disabled />
			<span
				className={cn(
					"text-sm",
					concluido ? "text-muted-foreground line-through" : "text-foreground",
				)}
			>
				{label}
			</span>
		</div>
	);
}
