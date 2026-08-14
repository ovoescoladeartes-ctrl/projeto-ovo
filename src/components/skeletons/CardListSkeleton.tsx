import { Skeleton } from "@/components/ui/skeleton";

interface CardListSkeletonProps {
	rows?: number;
}

/** Esqueleto da lista de Pendências (`PendenciasList`) — título + badge de contagem + linhas divididas. */
export function CardListSkeleton({ rows = 3 }: CardListSkeletonProps): React.ReactElement {
	return (
		<section>
			<div className="mb-3 flex items-center gap-2">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-5 w-5 rounded-full" />
			</div>
			<div className="divide-y divide-border overflow-hidden rounded-xl border border-l-4 border-border border-l-foreground bg-card">
				{Array.from({ length: rows }).map((_, index) => (
					<div key={index} className="flex items-center gap-3 p-4">
						<Skeleton className="h-9 w-9 shrink-0 rounded-full" />
						<div className="flex-1">
							<Skeleton className="h-4 w-1/2" />
							<Skeleton className="mt-2 h-3 w-1/3" />
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
