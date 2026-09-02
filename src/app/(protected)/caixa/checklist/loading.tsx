import { CardListSkeleton } from "@/components/skeletons/CardListSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";

export default function Loading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton />
			<CardListSkeleton rows={5} />
		</div>
	);
}
