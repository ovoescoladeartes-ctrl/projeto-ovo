import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton />

			{/* Abas Financeiro/Comunicação — mesmo padrão underline do dashboard. */}
			<div className="mb-6 flex gap-6 border-b border-border pb-2">
				<Skeleton className="h-5 w-20" />
				<Skeleton className="h-5 w-28" />
			</div>

			{/* Ativos/Arquivados (chips) + "Novo checklist", dentro da aba ativa. */}
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex gap-2">
					<Skeleton className="h-[30px] w-16 rounded-full" />
					<Skeleton className="h-[30px] w-24 rounded-full" />
				</div>
				<Skeleton className="h-9 w-36" />
			</div>

			<CardGridSkeleton count={3} colsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" variant="funil" />
		</div>
	);
}
