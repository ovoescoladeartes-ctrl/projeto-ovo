import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RitualChecklistItemData } from "@/core/dashboard/types";

import { RitualChecklistItem } from "./RitualChecklistItem";

/** Prévia do Dashboard mostra só os 2 primeiros itens (ordem fixa) — mesmo recorte do Figma (frame "home-wireframe-financeiro"), que exibe exatamente os itens 1-2 dos 5 do Ritual. A lista completa/interativa vive em `/caixa/checklist`. */
const ITENS_NA_PREVIA = 2;

interface RitualChecklistProps {
	items: RitualChecklistItemData[];
}

export function RitualChecklist({ items }: RitualChecklistProps): React.ReactElement {
	const pendentes = items.filter((item) => !item.concluido).length;

	return (
		<Card>
			<CardHeader className="flex-row items-center gap-2 space-y-0">
				<CardTitle className="text-base">Ritual de Segunda</CardTitle>
				<Badge variant="secondary">
					{pendentes} de {items.length} pendentes
				</Badge>
			</CardHeader>
			<CardContent className="pt-0">
				{items.slice(0, ITENS_NA_PREVIA).map((item) => (
					<RitualChecklistItem key={item.id} label={item.label} concluido={item.concluido} />
				))}
				<Link href="/caixa/checklist" className="mt-3 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline">
					Ver checklist completo →
				</Link>
			</CardContent>
		</Card>
	);
}
