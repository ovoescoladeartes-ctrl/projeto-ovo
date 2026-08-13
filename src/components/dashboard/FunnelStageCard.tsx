import { Card } from "@/components/ui/card";
import type { FunnelStageCount } from "@/core/dashboard/types";

type FunnelStageCardProps = Omit<FunnelStageCount, "kind">;

export function FunnelStageCard({ label, value }: FunnelStageCardProps): React.ReactElement {
	return (
		<Card className="min-w-0 p-4">
			<p className="break-words text-xs text-muted-foreground">{label}</p>
			<p className="mt-1 break-words text-2xl font-bold text-foreground">{value}</p>
		</Card>
	);
}
