"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { restaurarMatricula } from "./actions";

interface MatriculaRestaurarButtonProps {
	id: string;
	pessoaId: string;
}

/** Desfaz um "Encerrar" por engano — reversível na hora, sem confirmação (pode encerrar de novo se for o caso). */
export function MatriculaRestaurarButton({ id, pessoaId }: MatriculaRestaurarButtonProps): React.ReactElement {
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleRestaurar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await restaurarMatricula({ id, pessoaId });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível restaurar.");
			}
		});
	}

	return (
		<div className="flex flex-col items-end gap-1">
			<Button type="button" variant="ghost" size="sm" onClick={handleRestaurar} disabled={isPending}>
				{isPending ? "Restaurando..." : "Restaurar"}
			</Button>
			{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
		</div>
	);
}
