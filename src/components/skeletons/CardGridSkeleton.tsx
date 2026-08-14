import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardGridSkeletonProps {
	count: number;
	/**
	 * Classes completas de `grid-cols-*` (incluindo o breakpoint base), copiadas de
	 * `KpiCardsGrid`/`FunnelStageRow` — não combine com um `grid-cols-*` já default no
	 * componente: duas classes `grid-cols-*` sem prefixo coexistindo é a mesma armadilha de
	 * ordem não determinística de `className` documentada em docs/design.md.
	 */
	colsClassName: string;
	/** Cards de KPI (`p-5`, número grande) vs. cards de estágio do funil (`p-4`, número menor). */
	variant?: "kpi" | "funil";
}

/** Esqueleto de grid de `Card` — usado no lugar de `KpiCardsGrid`/`FunnelStageRow` durante o carregamento. */
export function CardGridSkeleton({ count, colsClassName, variant = "kpi" }: CardGridSkeletonProps): React.ReactElement {
	return (
		<div className={cn("grid gap-4", colsClassName)}>
			{Array.from({ length: count }).map((_, index) => (
				<Card key={index} className={variant === "kpi" ? "min-w-0 p-5" : "min-w-0 p-4"}>
					<Skeleton className="h-3 w-2/3" />
					<Skeleton className={cn("mt-2", variant === "kpi" ? "h-8 w-1/2" : "h-6 w-1/3")} />
					{variant === "kpi" ? <Skeleton className="mt-1 h-4 w-1/3" /> : null}
				</Card>
			))}
		</div>
	);
}
