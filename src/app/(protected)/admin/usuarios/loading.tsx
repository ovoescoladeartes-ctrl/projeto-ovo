import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** `admin/usuarios/page.tsx` não tem CTA nem busca no cabeçalho — só breadcrumb + H1, sem o padrão de `PageHeaderSkeleton`. */
export default function Loading(): React.ReactElement {
	return (
		<div>
			<Skeleton className="mb-2 h-4 w-64" />
			<Skeleton className="mb-6 mt-2 h-8 w-56 sm:h-9" />
			<TableSkeleton columns={4} rows={8} />
		</div>
	);
}
