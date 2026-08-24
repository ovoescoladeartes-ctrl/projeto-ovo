import { CardListSkeleton } from "@/components/skeletons/CardListSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";

export default function ChecklistLoading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton />
			<CardListSkeleton rows={5} />
			<div className="mt-6">
				<CardListSkeleton rows={1} />
			</div>
		</div>
	);
}
