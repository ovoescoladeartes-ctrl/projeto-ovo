"use client";

import { useState } from "react";

import { alternarItemFechamento } from "@/app/(protected)/caixa/fechamento/actions";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { RitualChecklistItem } from "@/components/dashboard/RitualChecklistItem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { FechamentoConsolidado, FechamentoItemId } from "@/core/financeiro/fechamento/schema";

interface ChecklistFechamentoProps {
	fechamento: FechamentoConsolidado;
}

/** Fechamento Mensal — card resumido no dashboard, lista completa (6 itens fixos + linhas "Reconciliar Semana N" derivadas) num painel aberto sob demanda. */
export function ChecklistFechamento({ fechamento }: ChecklistFechamentoProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const concluidos = fechamento.linhas.filter((linha) => linha.concluido).length;

	return (
		<>
			<Card>
				<CardHeader className="flex-row items-center gap-2 space-y-0">
					<CardTitle className="text-base">Fechamento Mensal — {fechamento.periodoLabel}</CardTitle>
					<Badge variant="secondary">
						{concluidos} de {fechamento.linhas.length} concluídos
					</Badge>
				</CardHeader>
				<CardContent className="pt-0">
					<p className="mb-3 text-sm text-muted-foreground">
						Itens fixos de fechamento e a reconciliação das semanas do mês.
					</p>
					<Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
						Ver checklist completo
					</Button>
				</CardContent>
			</Card>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Fechamento Mensal — {fechamento.periodoLabel}</SheetTitle>
					</SheetHeader>

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
				</SheetContent>
			</Sheet>
		</>
	);
}
