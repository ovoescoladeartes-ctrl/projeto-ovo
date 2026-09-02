import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface RitualChecklistItemProps {
	label: string;
	concluido: boolean;
}

/** Item de checklist só-leitura, usado em prévias que não persistem estado (ex.: `VagoesChecklist`). O toggle interativo e persistido do Ritual financeiro é `RitualItemCheckbox`. */
export function RitualChecklistItem({ label, concluido }: RitualChecklistItemProps): React.ReactElement {
	return (
		<div className="flex items-center gap-3 py-1.5">
			<Checkbox checked={concluido} disabled />
			<span className={cn("text-sm", concluido ? "text-muted-foreground line-through" : "text-foreground")}>{label}</span>
		</div>
	);
}
