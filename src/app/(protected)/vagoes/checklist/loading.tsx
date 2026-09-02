import { CardListSkeleton } from "@/components/skeletons/CardListSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";

export default function ChecklistLoading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton />
			<div className="flex flex-col gap-6">
				<CardListSkeleton rows={3} />
				<CardListSkeleton rows={2} />
				<CardListSkeleton rows={2} />
			</div>
		</div>
	);
}
