import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderSkeletonProps {
	/** Dashboard é a única rota sem `PageBreadcrumb` (regra 12 de docs/design.md). */
	breadcrumb?: boolean;
	/** Bloco de Tabs (Comunicação/Financeiro, Recebimentos/Repasses) logo abaixo do H1. */
	tabs?: boolean;
	/** Linha de filtros (chips, selects) abaixo das tabs/H1. */
	filtros?: boolean;
}

/**
 * Esqueleto do cabeçalho padrão de página interna (regra 15 de docs/design.md):
 * Breadcrumb → H1 + busca + CTA → Tabs → Filtros.
 */
export function PageHeaderSkeleton({
	breadcrumb = true,
	tabs = false,
	filtros = false,
}: PageHeaderSkeletonProps): React.ReactElement {
	return (
		<div>
			{breadcrumb ? <Skeleton className="mb-2 h-4 w-48" /> : null}
			<div className="mb-6 mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<Skeleton className="h-8 w-40 sm:h-9" />
				<Skeleton className="h-9 w-full sm:max-w-xs sm:flex-1" />
				<Skeleton className="h-9 w-28 shrink-0" />
			</div>

			{tabs ? (
				<div className="mb-6 flex gap-6 border-b border-border pb-2">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-24" />
				</div>
			) : null}

			{filtros ? (
				<div className="mb-6 flex flex-wrap items-center gap-3">
					<Skeleton className="h-[30px] w-24 rounded-full" />
					<Skeleton className="h-[30px] w-24 rounded-full" />
					<Skeleton className="h-[30px] w-36" />
				</div>
			) : null}
		</div>
	);
}
