import { Card } from "@/components/ui/card";
import type { KpiCardData } from "@/core/dashboard/types";

export function KpiCard({ label, value, subtitle }: KpiCardData): React.ReactElement {
	return (
		<Card className="min-w-0 p-5">
			<p className="break-words text-xs font-medium text-muted-foreground">{label}</p>
			<p className="mt-2 break-words text-3xl font-bold text-foreground">{value}</p>
			<p className="mt-1 break-words text-sm text-muted-foreground">{subtitle}</p>
		</Card>
	);
}
