import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { CardListSkeleton } from "@/components/skeletons/CardListSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";

export default function Loading(): React.ReactElement {
	return (
		<div className="flex flex-col gap-6">
			<PageHeaderSkeleton breadcrumb={false} tabs />
			<CardGridSkeleton count={4} colsClassName="grid-cols-1 sm:grid-cols-4" variant="kpi" />
			<CardGridSkeleton count={6} colsClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" variant="funil" />
			<CardListSkeleton rows={4} />
		</div>
	);
}
