"use client";

import { alternarItemFechamento } from "@/app/(protected)/caixa/fechamento/actions";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { RitualChecklistItem } from "@/components/dashboard/RitualChecklistItem";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FechamentoConsolidado, FechamentoItemId } from "@/core/financeiro/fechamento/schema";

interface ChecklistFechamentoProps {
	fechamento: FechamentoConsolidado;
}

/** Fechamento Mensal vira card no dashboard (era página própria `/caixa/fechamento`) — mesmo dado, mesma composição fixo+derivado, só muda de onde vive. */
export function ChecklistFechamento({ fechamento }: ChecklistFechamentoProps): React.ReactElement {
	const concluidos = fechamento.linhas.filter((linha) => linha.concluido).length;

	return (
		<Card>
			<CardHeader className="flex-row items-center gap-2 space-y-0">
				<CardTitle className="text-base">Fechamento Mensal — {fechamento.periodoLabel}</CardTitle>
				<Badge variant="secondary">
					{concluidos} de {fechamento.linhas.length} concluídos
				</Badge>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="divide-y divide-border">
					{fechamento.linhas.map((linha) =>
						linha.tipo === "fixo" ? (
							<ChecklistItemToggle
								key={linha.id}
								label={linha.label}
								concluido={linha.concluido}
								onToggle={(concluido) =>
									alternarItemFechamento({ periodo: fechamento.periodo, itemId: linha.id as FechamentoItemId, concluido })
								}
							/>
						) : (
							<RitualChecklistItem key={linha.id} label={linha.label} concluido={linha.concluido} />
						),
					)}
				</div>
			</CardContent>
		</Card>
	);
}
