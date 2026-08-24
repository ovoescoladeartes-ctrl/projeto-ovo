import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PendenciaAcionavelItem } from "@/core/financeiro/pendencias/consultas";

import { ResolverManualButton } from "./ResolverManualButton";

interface PendenciaAcionavelRowProps {
	item: PendenciaAcionavelItem;
}

export function PendenciaAcionavelRow({ item }: PendenciaAcionavelRowProps): React.ReactElement {
	return (
		<div className="flex items-center gap-3 px-4 py-3">
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">{item.titulo}</p>
				<p className="truncate text-xs text-muted-foreground">{item.origemLabel}</p>
			</div>
			{item.acao === "manual" && item.manualId !== undefined ? (
				<ResolverManualButton id={item.manualId} />
			) : (
				<Button type="button" variant="outline" size="sm" asChild>
					<Link href={item.href ?? "/caixa"}>Ver</Link>
				</Button>
			)}
		</div>
	);
}
