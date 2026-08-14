import { Skeleton } from "@/components/ui/skeleton";
import { BUCKETS } from "@/core/comunicacao/buckets";

/** Esqueleto do board de Vagões — replica as 6 colunas kanban (`Board.tsx`) em desktop e uma coluna em mobile. */
export function BoardSkeleton(): React.ReactElement {
	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="hidden min-h-0 flex-1 md:grid md:grid-cols-6 md:gap-6">
				{BUCKETS.map((bucket) => (
					<div key={bucket.key} className="flex min-w-0 flex-col rounded-lg bg-column p-3">
						<div className="mb-3 flex items-center gap-2 px-1">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-6 w-6 shrink-0 rounded-full" />
						</div>
						<div className="flex flex-col gap-2">
							<Skeleton className="h-24 w-full rounded-lg" />
							<Skeleton className="h-24 w-full rounded-lg" />
						</div>
					</div>
				))}
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-3 md:hidden">
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-24 w-full rounded-lg" />
				<Skeleton className="h-24 w-full rounded-lg" />
				<Skeleton className="h-24 w-full rounded-lg" />
			</div>
		</div>
	);
}
