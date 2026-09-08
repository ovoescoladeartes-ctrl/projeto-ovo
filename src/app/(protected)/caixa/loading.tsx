import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function Loading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton tabs />
			<div className="mb-6">
				<CardGridSkeleton count={3} colsClassName="grid-cols-1 sm:grid-cols-4" variant="kpi" />
			</div>
			<TableSkeleton columns={7} rows={10} />
		</div>
	);
}
