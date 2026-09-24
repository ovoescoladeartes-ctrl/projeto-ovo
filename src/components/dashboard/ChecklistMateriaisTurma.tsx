"use client";

import { useState } from "react";

import { alternarItemMaterial, excluirItemMaterial } from "@/app/(protected)/vagoes/materiais/actions";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { GrupoMateriaisPendentes } from "@/core/comunicacao/materiais/agrupar";

interface ChecklistMateriaisTurmaProps {
	grupo: GrupoMateriaisPendentes;
}

/**
 * Card de Materiais de UMA turma (ou "Geral") — um card por grupo com pendência, nunca um único
 * card reunindo várias turmas (carrossel/scroll interno já tentado e descartado, ver
 * `docs/spec-checklist-materiais.md`).
 *
 * Não implementa o contrato `ChecklistResumo` nem usa `ChecklistCard` genérico por dentro — decisão
 * já registrada em `core/checklist/schema.ts`/`ChecklistCard.tsx` ("Materiais não entra aqui/tem seu
 * próprio card por turma"), mantida aqui de propósito porque um grupo dinâmico por turma não tem os
 * conceitos de pin/arquivar/score do motor genérico. Em compensação, replica deliberadamente a MESMA
 * anatomia visual do `ChecklistCard` (badge de tema, título, caixa de itens de altura fixa, badge de
 * contagem colorida, botão "Ver checklist completo") pra ficar indistinguível dele lado a lado na
 * mesma faixa — só sem o botão de pin. `ChecklistCard.tsx` não é modificado (regra já fechada,
 * só reusada por outros checklists).
 */
export function ChecklistMateriaisTurma({ grupo }: ChecklistMateriaisTurmaProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const titulo = grupo.turmaId === null ? "Materiais — Geral" : `Materiais — ${grupo.turmaNome}`;
	// Todo item de um grupo já é pendente por construção (`agruparMateriaisPendentesPorTurma`) — o
	// badge é sempre "N pendentes" em âmbar, nunca "Tudo em dia"/"Sem itens" (só fazem sentido pro
	// `ChecklistCard` genérico, que também mostra checklist vazio/concluído).
	const totalPendentes = grupo.itens.length;

	function renderItem(item: GrupoMateriaisPendentes["itens"][number]): React.ReactElement {
		return (
			<ChecklistItemToggle
				key={item.id}
				label={item.titulo}
				concluido={item.comprado}
				onToggle={(comprado) => alternarItemMaterial({ id: item.id, comprado })}
				onExcluir={() => excluirItemMaterial({ id: item.id })}
			/>
		);
	}

	return (
		<>
			<Card className="min-w-0">
				<CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
					<div className="flex flex-col gap-1">
						<Badge variant="outline" className="w-fit shrink-0 text-xs font-normal text-muted-foreground">
							Materiais
						</Badge>
						<CardTitle className="line-clamp-2 min-h-[2.6em] text-base leading-[1.3]">{titulo}</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-3 pt-0">
					<div className="h-48 overflow-y-auto rounded-lg border border-border">
						<div className="divide-y divide-border">{grupo.itens.map(renderItem)}</div>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<Badge className="border-transparent bg-amber-100 text-amber-800">
							{totalPendentes} pendente{totalPendentes === 1 ? "" : "s"}
						</Badge>
						<Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
							Ver checklist completo
						</Button>
					</div>
				</CardContent>
			</Card>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>{titulo}</SheetTitle>
					</SheetHeader>
					<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">{grupo.itens.map(renderItem)}</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
