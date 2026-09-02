"use client";

import { useState, useTransition } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ChecklistToggleResult {
	status: "ok" | "error";
	message?: string;
}

interface ChecklistItemToggleProps {
	label: string;
	concluido: boolean;
	onToggle: (concluido: boolean) => Promise<ChecklistToggleResult>;
	meta?: string;
	/** Nome de onde derivar as iniciais do avatar (Figma: "Generic avatar") — só itens de contato têm. */
	avatarNome?: string;
	/** Estilo vermelho de pendência atrasada (Figma: frame "4 · Checklist (vermelho)"). */
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

/**
 * Checkbox otimista genérico — estado local + `useTransition` + revert em erro, chamando
 * `onToggle` (a server action de cada domínio já parcialmente aplicada pelo caller). Cobre
 * Ritual/Fechamento (financeiro) e Checklist do Dia/Materiais (comunicação): layout compacto por
 * padrão, ou "rico" (avatar/meta/destaque) quando alguma dessas props é passada.
 */
export function ChecklistItemToggle({ label, concluido, onToggle, meta, avatarNome, destaque = false }: ChecklistItemToggleProps): React.ReactElement {
	const [marcado, setMarcado] = useState(concluido);
	const [isPending, startTransition] = useTransition();

	function handleCheckedChange(checked: boolean | "indeterminate"): void {
		const proximo = checked === true;
		setMarcado(proximo);
		startTransition(async () => {
			const resultado = await onToggle(proximo);
			if (resultado.status === "error") {
				setMarcado(!proximo);
			}
		});
	}

	const rico = avatarNome !== undefined || meta !== undefined || destaque;

	if (!rico) {
		return (
			<div className="flex items-center gap-3 py-1.5">
				<Checkbox checked={marcado} disabled={isPending} onCheckedChange={handleCheckedChange} />
				<span className={cn("text-sm", marcado ? "text-muted-foreground line-through" : "text-foreground")}>{label}</span>
			</div>
		);
	}

	return (
		<div className={cn("flex items-center gap-3 px-4 py-3", destaque && !marcado && "border-l-4 border-l-red-600")}>
			{avatarNome !== undefined ? (
				<Avatar className="h-9 w-9 shrink-0">
					<AvatarFallback className="text-xs font-medium">{iniciaisDoNome(avatarNome)}</AvatarFallback>
				</Avatar>
			) : null}
			<div className="min-w-0 flex-1">
				<p className={cn("text-sm font-medium", marcado ? "text-muted-foreground line-through" : destaque ? "text-red-700" : "text-foreground")}>
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
