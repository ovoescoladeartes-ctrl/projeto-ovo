import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto da ficha de Pessoa — modela o caso mais comum (aluno com Matrículas), a seção Professor não entra (regra 20: forma geral, não pixel-perfect). */
export default function Loading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton align="start" badges />

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
