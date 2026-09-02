import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { CardListSkeleton } from "@/components/skeletons/CardListSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";

export default function FechamentoLoading(): React.ReactElement {
	return (
		<div className="flex flex-col gap-6">
			<PageHeaderSkeleton />
			<CardGridSkeleton count={3} colsClassName="grid-cols-1 sm:grid-cols-3" variant="kpi" />
			<CardListSkeleton rows={10} />
		</div>
	);
}
