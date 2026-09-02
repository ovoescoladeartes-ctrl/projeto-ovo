"use client";

import { useState } from "react";

import { alternarItemMaterial } from "@/app/(protected)/vagoes/materiais/actions";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { AdicionarMaterialDialog } from "@/components/dashboard/AdicionarMaterialDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ItemMaterial } from "@/core/comunicacao/materiais/schema";

interface ChecklistMateriaisProps {
	itens: ItemMaterial[];
}

/**
 * Checklist de Materiais: adiciona item → marca como comprado → 100% quando tudo comprado.
 * Feature nova, pedida pra substituir o antigo botão "Adicionar Material" do Checklist do Dia
 * (que só criava um item de texto livre genérico, sem esse fluxo de compra).
 */
export function ChecklistMateriais({ itens }: ChecklistMateriaisProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const comprados = itens.filter((item) => item.comprado).length;
	const tudoComprado = itens.length > 0 && comprados === itens.length;

	return (
		<>
			<Card>
				<CardHeader className="flex-row items-center gap-2 space-y-0">
					<CardTitle className="text-base">Materiais</CardTitle>
					<Badge variant={tudoComprado ? "outline" : "secondary"}>
						{tudoComprado ? "Tudo comprado" : `${comprados} de ${itens.length} comprados`}
					</Badge>
				</CardHeader>
				<CardContent className="pt-0">
					<p className="mb-3 text-sm text-muted-foreground">Lista de compra: adicione itens e marque como comprados.</p>
					<Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
						Ver checklist completo
					</Button>
				</CardContent>
			</Card>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Materiais</SheetTitle>
					</SheetHeader>

					<div className="flex justify-end">
						<AdicionarMaterialDialog />
					</div>
					{itens.length > 0 ? (
						<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
							{itens.map((item) => (
								<ChecklistItemToggle
									key={item.id}
									label={item.titulo}
									concluido={item.comprado}
									onToggle={(comprado) => alternarItemMaterial({ id: item.id, comprado })}
								/>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">Nenhum material adicionado ainda.</p>
					)}
				</SheetContent>
			</Sheet>
		</>
	);
}
