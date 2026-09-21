"use client";

import { Pin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { alternarPinChecklist } from "@/app/(protected)/checklist/actions";
import { Button } from "@/components/ui/button";
import type { ChecklistOrigem } from "@/core/checklist/schema";
import { cn } from "@/lib/utils";

interface ChecklistPinButtonProps {
	id: string;
	origem: ChecklistOrigem;
	pinado: boolean;
}

/**
 * Terciário (`ghost`/ícone sozinho, regra 26 do design.md) — nunca `outline`/`default`, pra não
 * competir visualmente com "Ver checklist completo" (seção 5.2 da spec). Otimista, mesmo padrão de
 * `ChecklistItemToggle`.
 *
 * Não pinado: ícone contornado, `text-muted-foreground` (mesmo tom neutro de texto secundário do
 * resto do app). Pinado: ícone preenchido (`fill="currentColor"`) em `text-primary` — a mesma cor
 * usada em `Chip` pra estado "ativo/selecionado" (`bg-primary`/`text-primary-foreground`), não uma
 * cor nova. Deliberadamente sem usar vermelho/laranja de urgência (já significa "atenção" em
 * badges de contato/pendência — usar aqui confundiria "pinado" com "tem problema").
 */
export function ChecklistPinButton({ id, origem, pinado }: ChecklistPinButtonProps): React.ReactElement {
	const [marcado, setMarcado] = useState(pinado);
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	function handleClick(): void {
		const proximo = !marcado;
		setMarcado(proximo);
		startTransition(async () => {
			const resultado = await alternarPinChecklist({ id, origem, pinado: proximo });
			if (resultado.status === "error") {
				setMarcado(!proximo);
				return;
			}
			// Mesmo motivo do `ChecklistItemToggle`: força o refetch dos dados do Server Component
			// pai, já que fixar/desafixar muda a ordem da faixa (score/pin) e isso vem de fora do
			// estado local deste botão.
			router.refresh();
		});
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			disabled={isPending}
			onClick={handleClick}
			aria-label={marcado ? "Desafixar checklist" : "Fixar checklist"}
			title={marcado ? "Desafixar checklist" : "Fixar checklist"}
			className="shrink-0"
		>
			<Pin className={cn("h-4 w-4", marcado ? "fill-current text-primary" : "text-muted-foreground")} />
		</Button>
	);
}
