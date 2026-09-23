"use client";

import { useState } from "react";

import { alternarItemChecklistCustomizado } from "@/app/(protected)/checklist/actions";
import { ChecklistAcaoRow } from "@/components/checklist/ChecklistAcaoRow";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistCustomizadoSheet } from "@/components/checklist/ChecklistCustomizadoSheet";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { ordenarItensCard, type ItemOrdenavelCard } from "@/components/checklist/ordenarItensCard";
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

	// Mesma classificação por comportamento do `ChecklistCustomizadoSheet` (não por categoria de
	// negócio): "Ações" é todo item com `actionHref` (botão navegável de verdade); "Conferência" é
	// o resto.
	const itensComAcao = itens.filter((item) => item.actionHref !== undefined && item.actionLabel !== undefined);
	const itensSemAcao = itens.filter((item) => item.actionHref === undefined || item.actionLabel === undefined);

	function renderItemAcao(item: ChecklistItem): React.ReactElement {
		return <ChecklistAcaoRow key={item.id} titulo={item.titulo} explicacao={item.explicacao} href={item.actionHref} />;
	}

	function renderItemConferencia(item: ChecklistItem): React.ReactElement {
		return (
			<ChecklistItemToggle
				key={item.id}
				label={item.titulo}
				concluido={item.concluido}
				explicacao={item.explicacao}
				onToggle={(concluido) => alternarItemChecklistCustomizado({ checklistId: resumo.id, itemId: item.id, concluido })}
			/>
		);
	}

	// Uma lista só, ordenada por Ações > ordem original (regra 38 do design.md) — checklist
	// customizado não tem conceito de item atrasado/herdado, então todo item entra com atraso 0.
	const itensCard: (ItemOrdenavelCard & { key: string; node: React.ReactElement })[] = [
		...itensComAcao.map((item) => ({ atraso: 0, tipo: "acao" as const, key: item.id, node: renderItemAcao(item) })),
		...itensSemAcao.map((item) => ({ atraso: 0, tipo: "conferencia" as const, key: item.id, node: renderItemConferencia(item) })),
	];

	return (
		<>
			{/* Lista completa dentro do card (item 4 do feedback de revisão), não um recorte — a área já
			tem altura fixa com scroll interno, tudo numa caixa só. Painel completo mantém a separação
			Ações/Conferência com rótulo de texto. */}
			<ChecklistCard resumo={resumo} totalItens={itens.length} itensPendentes={itensPendentes.length} onAbrir={() => setOpen(true)}>
				{itens.length > 0 ? ordenarItensCard(itensCard).map((item) => item.node) : undefined}
			</ChecklistCard>

			<ChecklistCustomizadoSheet checklistId={resumo.id} titulo={resumo.titulo} itens={itens} open={open} onOpenChange={setOpen} />
		</>
	);
}
