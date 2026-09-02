"use client";

import { alternarItemMaterial } from "@/app/(protected)/vagoes/materiais/actions";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { AdicionarMaterialDialog } from "@/components/dashboard/AdicionarMaterialDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	const comprados = itens.filter((item) => item.comprado).length;
	const tudoComprado = itens.length > 0 && comprados === itens.length;

	return (
		<Card>
			<CardHeader className="flex-row items-center gap-2 space-y-0">
				<CardTitle className="text-base">Materiais</CardTitle>
				<Badge variant={tudoComprado ? "outline" : "secondary"}>
					{tudoComprado ? "Tudo comprado" : `${comprados} de ${itens.length} comprados`}
				</Badge>
			</CardHeader>
			<CardContent className="flex flex-col gap-3 pt-0">
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
			</CardContent>
		</Card>
	);
}
