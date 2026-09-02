"use client";

import { useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import type { FechamentoItemId } from "@/core/financeiro/fechamento/itens";
import { cn } from "@/lib/utils";

import { alternarItemFechamento } from "./actions";

interface FechamentoItemRowProps {
	id: string;
	label: string;
	concluido: boolean;
	editavel: boolean;
	periodo: string;
}

export function FechamentoItemRow({ id, label, concluido, editavel, periodo }: FechamentoItemRowProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();
	const [erro, setErro] = useState<string | null>(null);

	function handleCheckedChange(checked: boolean | "indeterminate"): void {
		if (!editavel) {
			return;
		}
		setErro(null);
		startTransition(async () => {
			const result = await alternarItemFechamento({ periodo, itemId: id as FechamentoItemId, concluido: checked === true });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
			}
		});
	}

	return (
		<div className="px-4 py-3">
			<div className="flex items-center gap-3">
				<Checkbox checked={concluido} disabled={!editavel || isPending} onCheckedChange={handleCheckedChange} />
				<span className={cn("flex-1 text-sm", concluido ? "text-muted-foreground line-through" : "text-foreground")}>{label}</span>
				<span className="shrink-0 text-xs text-muted-foreground">{isPending ? "Salvando..." : concluido ? "Concluído" : "Pendente"}</span>
			</div>
			{erro !== null ? <p className="ml-[26px] mt-1 text-xs text-destructive">{erro}</p> : null}
		</div>
	);
}
