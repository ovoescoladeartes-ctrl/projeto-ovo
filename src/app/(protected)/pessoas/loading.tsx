import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton filtros />
			<div className="mb-6">
				<Skeleton className="h-[30px] w-40 rounded-full" />
			</div>
			<TableSkeleton columns={6} rows={10} />
		</div>
	);
}
