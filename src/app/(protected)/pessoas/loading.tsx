import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton />
			<div className="mb-6 flex gap-6 border-b border-border pb-2">
				<Skeleton className="h-5 w-14" />
				<Skeleton className="h-5 w-24" />
			</div>
			<TableSkeleton columns={6} rows={10} />
		</div>
	);
}
