import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
	columns: number;
	rows?: number;
}

/** Esqueleto de tabela — replica o wrapper `rounded-lg border` + `thead`/`tr` usado em toda listagem do app. */
export function TableSkeleton({ columns, rows = 8 }: TableSkeletonProps): React.ReactElement {
	return (
		<div className="overflow-hidden rounded-lg border border-border bg-card">
			<div className="flex items-center gap-4 border-b border-border bg-muted/50 px-4 py-3">
				{Array.from({ length: columns }).map((_, index) => (
					<Skeleton key={index} className="h-3 flex-1" />
				))}
			</div>
			<div className="divide-y divide-border">
				{Array.from({ length: rows }).map((_, rowIndex) => (
					<div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
						{Array.from({ length: columns }).map((_, colIndex) => (
							<Skeleton key={colIndex} className="h-4 flex-1" />
						))}
					</div>
				))}
			</div>
		</div>
	);
}
