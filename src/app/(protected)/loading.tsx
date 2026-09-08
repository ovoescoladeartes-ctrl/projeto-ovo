import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ChartCardSkeleton } from "@/components/skeletons/ChartCardSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto do Dashboard — modela a aba "Geral" (`VisaoGeralContent`), que é sempre a aba padrão
 * (`GERAL_ROLES` cobre todas as roles, ver `core/dashboard/consultas.ts`). `DashboardHeader` não
 * tem breadcrumb (regra 12 do design.md) e mostra a data no lugar do CTA — mesmo `spacing={false}`
 * do componente real, porque esse header já vive dentro do `gap-6` deste layout.
 */
export default function Loading(): React.ReactElement {
	return (
		<div className="flex flex-col gap-6">
			<PageHeaderSkeleton breadcrumb={false} cta={false} subtitle spacing={false} />

			<div className="flex gap-6 border-b border-border pb-2">
				<Skeleton className="h-5 w-14" />
				<Skeleton className="h-5 w-20" />
				<Skeleton className="h-5 w-28" />
			</div>

			<CardGridSkeleton count={4} colsClassName="grid-cols-2 sm:grid-cols-4" variant="kpi" />

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<ChartCardSkeleton />
				<ChartCardSkeleton />
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<ChartCardSkeleton />
				<ChartCardSkeleton />
			</div>
		</div>
	);
}
