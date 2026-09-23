"use client";

import { alternarItemChecklistCustomizado } from "@/app/(protected)/checklist/actions";
import { AdicionarItemChecklistCustomizadoDialog } from "@/components/checklist/AdicionarItemChecklistCustomizadoDialog";
import { ChecklistAcaoRow } from "@/components/checklist/ChecklistAcaoRow";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ChecklistItem } from "@/core/checklist/schema";

interface ChecklistCustomizadoSheetProps {
	checklistId: string;
	titulo: string;
	itens: ChecklistItem[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * "Ver checklist completo" de todo checklist customizado abre este Sheet genérico — sem exceção
 * (seção 5.3 da spec), diferente dos 3 checklists de sistema, que abrem o Sheet já existente de
 * cada domínio. Controlado por `open`/`onOpenChange` (mesmo padrão dos Sheets de
 * `ChecklistFinanceiro`/`ChecklistFechamento`/`VagoesChecklist`) — quem monta o card
 * (`ChecklistCustomizadoCard`) é dono do estado de aberto/fechado.
 */
export function ChecklistCustomizadoSheet({ checklistId, titulo, itens, open, onOpenChange }: ChecklistCustomizadoSheetProps): React.ReactElement {
	// Duas seções por comportamento, não por categoria de negócio (item 6 do feedback de revisão):
	// "Ações" é todo item com `actionHref` (botão navegável de verdade); "Conferência" é o resto.
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
				onToggle={(concluido) => alternarItemChecklistCustomizado({ checklistId, itemId: item.id, concluido })}
			/>
		);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>{titulo}</SheetTitle>
				</SheetHeader>

				{itens.length === 0 ? (
					<>
						<div className="flex justify-end">
							<AdicionarItemChecklistCustomizadoDialog checklistId={checklistId} />
						</div>
						<p className="text-sm text-muted-foreground">Nenhum item ainda — adicione o primeiro acima.</p>
					</>
				) : (
					<>
						{itensComAcao.length > 0 ? (
							<section>
								<div className="mb-2 flex items-center justify-between gap-2">
									<h3 className="text-sm font-semibold text-foreground">Ações</h3>
									<AdicionarItemChecklistCustomizadoDialog checklistId={checklistId} />
								</div>
								<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
									{itensComAcao.map(renderItemAcao)}
								</div>
							</section>
						) : (
							<div className="flex justify-end">
								<AdicionarItemChecklistCustomizadoDialog checklistId={checklistId} />
							</div>
						)}

						{itensSemAcao.length > 0 ? (
							<section>
								<h3 className="mb-2 text-sm font-semibold text-foreground">Conferência</h3>
								<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
									{itensSemAcao.map(renderItemConferencia)}
								</div>
							</section>
						) : null}
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
