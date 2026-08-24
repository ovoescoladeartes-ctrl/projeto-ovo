"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PendenciaManualId } from "@/core/financeiro/pendencias/manuais";

import { marcarPendenciaManualResolvida } from "./actions";

interface ResolverManualButtonProps {
	id: PendenciaManualId;
}

export function ResolverManualButton({ id }: ResolverManualButtonProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();
	const [erro, setErro] = useState<string | null>(null);

	function handleClick(): void {
		setErro(null);
		startTransition(async () => {
			const result = await marcarPendenciaManualResolvida({ id });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
			}
		});
	}

	return (
		<div className="flex flex-col items-end gap-1">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
						{isPending ? "Marcando..." : "Marcar como paga"}
					</Button>
				</TooltipTrigger>
				<TooltipContent>Confirmação manual — não gera ação automática no sistema.</TooltipContent>
			</Tooltip>
			{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
		</div>
	);
}
