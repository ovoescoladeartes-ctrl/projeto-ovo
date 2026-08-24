"use client";

import { useState, useTransition } from "react";

import { alternarItemRitual } from "@/app/(protected)/caixa/checklist/actions";
import { Checkbox } from "@/components/ui/checkbox";
import type { RitualItemId } from "@/core/financeiro/ritual/itens";
import { cn } from "@/lib/utils";

interface RitualChecklistItemProps {
	id: RitualItemId;
	label: string;
	concluido: boolean;
	semana: string;
}

export function RitualChecklistItem({ id, label, concluido, semana }: RitualChecklistItemProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();
	const [erro, setErro] = useState<string | null>(null);

	function handleCheckedChange(checked: boolean | "indeterminate"): void {
		setErro(null);
		startTransition(async () => {
			const result = await alternarItemRitual({ semana, itemId: id, concluido: checked === true });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
			}
		});
	}

	return (
		<div className="py-1.5">
			<div className="flex items-center gap-3">
				<Checkbox checked={concluido} disabled={isPending} onCheckedChange={handleCheckedChange} />
				<span className={cn("text-sm", concluido ? "text-muted-foreground line-through" : "text-foreground")}>{label}</span>
				{isPending ? <span className="text-xs text-muted-foreground">Salvando...</span> : null}
			</div>
			{erro !== null ? <p className="ml-[26px] text-xs text-destructive">{erro}</p> : null}
		</div>
	);
}
