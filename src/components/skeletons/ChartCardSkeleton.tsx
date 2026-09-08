import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto de card de gráfico (`Card p-5` com título + subtítulo + área de gráfico) — usado nas abas Geral e Financeiro do Dashboard (`VisaoGeralContent`, `FinanceiroContent`). */
export function ChartCardSkeleton(): React.ReactElement {
	return (
		<Card className="min-w-0 p-5">
			<Skeleton className="h-4 w-1/3" />
			<Skeleton className="mt-1 h-3 w-2/3" />
			<Skeleton className="mt-4 h-56 w-full rounded-lg" />
		</Card>
	);
}
