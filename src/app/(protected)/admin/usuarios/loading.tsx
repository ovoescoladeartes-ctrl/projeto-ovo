import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function Loading(): React.ReactElement {
	return (
		<div>
			<PageHeaderSkeleton cta={false} />
			<TableSkeleton columns={4} rows={8} />
		</div>
	);
}
