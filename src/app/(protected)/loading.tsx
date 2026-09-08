import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ChartCardSkeleton } from "@/components/skeletons/ChartCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto do Dashboard — modela a aba "Geral" (`VisaoGeralContent`), que é sempre a aba padrão
 * (`GERAL_ROLES` cobre todas as roles, ver `core/dashboard/consultas.ts`). `DashboardHeader` não
 * segue o cabeçalho padrão de `PageHeaderSkeleton` (sem breadcrumb, busca ou CTA — só H1 + data).
 */
export default function Loading(): React.ReactElement {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<Skeleton className="h-8 w-32 sm:h-9" />
				<Skeleton className="h-4 w-40" />
			</div>

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
