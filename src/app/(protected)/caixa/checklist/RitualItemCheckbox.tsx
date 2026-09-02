"use client";

import { useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import type { RitualItemId } from "@/core/financeiro/ritual/schema";
import { cn } from "@/lib/utils";

import { alternarItemRitual } from "./actions";

interface RitualItemCheckboxProps {
	id: RitualItemId;
	semana: string;
	label: string;
	concluido: boolean;
}

/** Checkbox real do Ritual, colocado na própria rota (mesmo padrão de `caixa/MarcarPagoButton.tsx`) — não é o `RitualChecklistItem` da prévia do Dashboard, que continua somente leitura. */
export function RitualItemCheckbox({ id, semana, label, concluido }: RitualItemCheckboxProps): React.ReactElement {
	const [marcado, setMarcado] = useState(concluido);
	const [isPending, startTransition] = useTransition();

	function handleCheckedChange(checked: boolean | "indeterminate"): void {
		const proximo = checked === true;
		setMarcado(proximo);
		startTransition(async () => {
			const resultado = await alternarItemRitual({ semana, itemId: id, concluido: proximo });
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
