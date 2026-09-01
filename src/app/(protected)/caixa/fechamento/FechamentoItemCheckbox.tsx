"use client";

import { useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import type { FechamentoItemId } from "@/core/financeiro/fechamento/schema";
import { cn } from "@/lib/utils";

import { alternarItemFechamento } from "./actions";

interface FechamentoItemCheckboxProps {
	id: FechamentoItemId;
	periodo: string;
	label: string;
	concluido: boolean;
}

/** Checkbox real de um item FIXO do Fechamento — mesma técnica de `caixa/checklist/RitualItemCheckbox.tsx`, aqui chamando `alternarItemFechamento`. As linhas "Reconciliar Semana N" (derivadas do Ritual) usam `RitualChecklistItem` (somente leitura), não este componente. */
export function FechamentoItemCheckbox({ id, periodo, label, concluido }: FechamentoItemCheckboxProps): React.ReactElement {
	const [marcado, setMarcado] = useState(concluido);
	const [isPending, startTransition] = useTransition();

	function handleCheckedChange(checked: boolean | "indeterminate"): void {
		const proximo = checked === true;
		setMarcado(proximo);
		startTransition(async () => {
			const resultado = await alternarItemFechamento({ periodo, itemId: id, concluido: proximo });
			if (resultado.status === "error") {
				setMarcado(!proximo);
			}
		});
	}

	return (
		<div className="flex items-center gap-3 py-1.5">
			<Checkbox checked={marcado} disabled={isPending} onCheckedChange={handleCheckedChange} />
			<span className={cn("text-sm", marcado ? "text-muted-foreground line-through" : "text-foreground")}>{label}</span>
		</div>
	);
}
