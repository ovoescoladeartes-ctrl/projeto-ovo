"use client";

import { useState, useTransition } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import type { ChecklistItemTipo } from "@/core/comunicacao/checklist/schema";
import { cn } from "@/lib/utils";

import { alternarItemChecklistComunicacao } from "./actions";

interface ChecklistItemCheckboxProps {
	dia: string;
	tipo: ChecklistItemTipo;
	itemId: string;
	label: string;
	meta?: string;
	concluido: boolean;
	/** Nome de onde derivar as iniciais do avatar — só itens de contato têm (Figma: "Generic avatar"); item manual não. */
	avatarNome?: string;
	/** Estilo vermelho de "Pendências anteriores" (Figma: frame "4 · Checklist (vermelho)", aprovado como tratamento final). */
	destaque?: boolean;
}

function iniciaisDoNome(nome: string): string {
	const partes = nome.trim().split(/\s+/).filter(Boolean);
	if (partes.length === 0) {
		return "?";
	}
	const primeira = partes[0]?.[0] ?? "";
	const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
	return (primeira + ultima).toUpperCase();
}

/** Checkbox real do Checklist do Dia — mesmo padrão otimista de `RitualItemCheckbox`/`FechamentoItemCheckbox` (financeiro), reaproveitado aqui pra contato (com avatar) e item manual (`tipo`). */
export function ChecklistItemCheckbox({
	dia,
	tipo,
	itemId,
	label,
	meta,
	concluido,
	avatarNome,
	destaque = false,
}: ChecklistItemCheckboxProps): React.ReactElement {
	const [marcado, setMarcado] = useState(concluido);
	const [isPending, startTransition] = useTransition();

	function handleCheckedChange(checked: boolean | "indeterminate"): void {
		const proximo = checked === true;
		setMarcado(proximo);
		startTransition(async () => {
			const resultado = await alternarItemChecklistComunicacao({ dia, tipo, itemId, concluido: proximo });
			if (resultado.status === "error") {
				setMarcado(!proximo);
			}
		});
	}

	return (
		<div className={cn("flex items-center gap-3 px-4 py-3", destaque && !marcado && "border-l-4 border-l-red-600")}>
			{avatarNome !== undefined ? (
				<Avatar className="h-9 w-9 shrink-0">
					<AvatarFallback className="text-xs font-medium">{iniciaisDoNome(avatarNome)}</AvatarFallback>
				</Avatar>
			) : null}
			<div className="min-w-0 flex-1">
				<p
					className={cn(
						"text-sm font-medium",
						marcado ? "text-muted-foreground line-through" : destaque ? "text-red-700" : "text-foreground",
					)}
				>
					{label}
				</p>
				{meta !== undefined ? (
					<p className={cn("text-xs", marcado ? "text-muted-foreground" : destaque ? "text-red-600" : "text-muted-foreground")}>{meta}</p>
				) : null}
			</div>
			<Checkbox checked={marcado} disabled={isPending} onCheckedChange={handleCheckedChange} className="shrink-0" />
		</div>
	);
}
