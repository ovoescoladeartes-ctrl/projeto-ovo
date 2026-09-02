import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RitualItemEstado } from "@/core/financeiro/ritual/schema";

import { RitualItemCheckbox } from "./RitualItemCheckbox";

const ITENS_VISIVEIS_NO_CARD = 2;

interface RitualChecklistProps {
	itens: RitualItemEstado[];
	semana: string;
	dataLabel: string;
}

export function RitualChecklist({ itens, semana, dataLabel }: RitualChecklistProps): React.ReactElement {
	const pendentes = itens.filter((item) => !item.concluido);

	return (
		<Card>
			<CardHeader className="flex-row items-center gap-2 space-y-0">
				<CardTitle className="text-base">Ritual de Segunda — {dataLabel}</CardTitle>
				<Badge variant="secondary">
					{pendentes.length} de {itens.length} pendentes
				</Badge>
			</CardHeader>
			<CardContent className="pt-0">
				{pendentes.slice(0, ITENS_VISIVEIS_NO_CARD).map((item) => (
					<RitualItemCheckbox key={item.id} id={item.id} label={item.label} concluido={item.concluido} semana={semana} />
				))}
				<Button variant="link" size="sm" asChild className="mt-1 h-auto px-0">
					<Link href="/caixa/checklist">
						Ver checklist completo
						<ArrowRight className="h-3.5 w-3.5" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
