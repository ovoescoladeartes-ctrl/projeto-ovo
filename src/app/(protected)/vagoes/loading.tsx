import { BoardSkeleton } from "@/components/skeletons/BoardSkeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";

export default function Loading(): React.ReactElement {
	return (
		<div className="flex h-full min-h-0 flex-col">
			<PageHeaderSkeleton tabs filtros />
			<div className="min-h-0 flex-1">
				<BoardSkeleton />
			</div>
		</div>
	);
}
