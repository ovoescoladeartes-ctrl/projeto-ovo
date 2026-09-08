import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto da ficha de Pessoa — modela o caso mais comum (aluno com Matrículas), a seção Professor não entra (regra 20: forma geral, não pixel-perfect). */
export default function Loading(): React.ReactElement {
	return (
		<div>
			<Skeleton className="mb-2 h-4 w-56" />
			<div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
				<div className="flex-1 space-y-4">
					<Skeleton className="h-8 w-56 sm:h-9" />
					<Skeleton className="h-4 w-48" />
				</div>
				<Skeleton className="h-9 w-24 shrink-0" />
			</div>

			<div className="mt-10">
				<Skeleton className="h-6 w-16" />
				<Skeleton className="mt-1 h-4 w-32" />
				<div className="mt-4 mb-3 flex items-center justify-between">
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-9 w-32" />
				</div>
				<TableSkeleton columns={7} rows={3} />
			</div>

			<div className="mt-10">
				<Skeleton className="mb-3 h-5 w-32" />
				<TableSkeleton columns={5} rows={5} />
			</div>
		</div>
	);
}
