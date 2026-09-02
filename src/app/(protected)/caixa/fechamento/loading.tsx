import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { CardListSkeleton } from "@/components/skeletons/CardListSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";

export default function Loading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton />
			<div className="mb-6">
				<CardGridSkeleton count={3} colsClassName="grid-cols-1 sm:grid-cols-3" variant="kpi" />
			</div>
			<CardListSkeleton rows={10} />
		</div>
	);
}
