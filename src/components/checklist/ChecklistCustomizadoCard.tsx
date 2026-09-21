"use client";

import { useState } from "react";

import { alternarItemChecklistCustomizado } from "@/app/(protected)/checklist/actions";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistCustomizadoSheet } from "@/components/checklist/ChecklistCustomizadoSheet";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import type { ChecklistItem, ChecklistResumo } from "@/core/checklist/schema";

interface ChecklistCustomizadoCardProps {
	resumo: ChecklistResumo;
	itens: ChecklistItem[];
}

/**
 * Unidade autocontida (`ChecklistCard` + `ChecklistCustomizadoSheet`), mesmo padrão dos 3
 * checklists de sistema (`ChecklistFinanceiro`/`ChecklistFechamento`/`VagoesChecklist`) — usada
 * tanto na faixa do dashboard quanto na página de gestão (`/checklists`) pra todo checklist
 * customizado. Não listada explicitamente em "Arquivos a
 * criar" da spec (§11), mas necessária: sem ela não há como um checklist customizado virar um
 * item da faixa sem duplicar a lógica de abrir/fechar Sheet em cada lugar que a usa.
 */
export function ChecklistCustomizadoCard({ resumo, itens }: ChecklistCustomizadoCardProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const itensPendentes = itens.filter((item) => !item.concluido);

	return (
		<>
			{/* Lista completa dentro do card (item 4 do feedback de revisão), não um recorte — a área já
			tem altura fixa com scroll interno. */}
			<ChecklistCard resumo={resumo} totalItens={itens.length} itensPendentes={itensPendentes.length} onAbrir={() => setOpen(true)}>
				{itens.length > 0 ? (
					itens.map((item) => (
						<ChecklistItemToggle
							key={item.id}
							label={item.titulo}
							concluido={item.concluido}
							actionHref={item.actionHref}
							actionLabel={item.actionLabel}
							explicacao={item.explicacao}
							onToggle={(concluido) => alternarItemChecklistCustomizado({ checklistId: resumo.id, itemId: item.id, concluido })}
						/>
					))
				) : undefined}
			</ChecklistCard>

			<ChecklistCustomizadoSheet checklistId={resumo.id} titulo={resumo.titulo} itens={itens} open={open} onOpenChange={setOpen} />
		</>
	);
}
