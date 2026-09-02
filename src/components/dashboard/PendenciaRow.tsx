import { AlertCircle, AlertTriangle, Calendar, Clock, FileText, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PendenciaIcon, PendenciaItem } from "@/core/dashboard/types";

const ICONS: Record<PendenciaIcon, React.ComponentType<{ className?: string }>> = {
	erro: XCircle,
	aviso: AlertTriangle,
	info: AlertCircle,
	prazo: Clock,
	documento: FileText,
	calendario: Calendar,
};

type PendenciaRowProps = Omit<PendenciaItem, "id">;

export function PendenciaRow({ icon, titulo, meta }: PendenciaRowProps): React.ReactElement {
	const Icon = ICONS[icon];

	return (
		<div className="flex items-center gap-3 px-4 py-3">
			<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
			<p className="flex-1 truncate text-sm font-medium text-foreground">{titulo}</p>
			<p className="hidden shrink-0 text-sm text-muted-foreground sm:block">{meta}</p>
			<Button type="button" variant="outline" size="sm">
				Ver
			</Button>
		</div>
	);
}
