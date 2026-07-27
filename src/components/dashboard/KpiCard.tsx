import { Card } from "@/components/ui/card";
import type { KpiCardData } from "@/core/dashboard/types";

export function KpiCard({ label, value, subtitle }: KpiCardData): React.ReactElement {
	return (
		<Card className="p-5">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
			<p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
			<p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
		</Card>
	);
}
