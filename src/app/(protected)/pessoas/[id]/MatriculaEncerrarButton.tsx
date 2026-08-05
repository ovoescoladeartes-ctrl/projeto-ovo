"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { encerrarMatricula } from "./actions";

interface MatriculaEncerrarButtonProps {
	id: string;
	pessoaId: string;
}

export function MatriculaEncerrarButton({ id, pessoaId }: MatriculaEncerrarButtonProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();

	function handleEncerrar(): void {
		startTransition(async () => {
			await encerrarMatricula({ id, pessoaId });
		});
	}

	return (
		<Button type="button" variant="ghost" size="sm" onClick={handleEncerrar} disabled={isPending}>
			{isPending ? "Encerrando..." : "Encerrar"}
		</Button>
	);
}
