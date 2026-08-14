"use client";

import { useState, useTransition } from "react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { restaurarMatricula } from "./actions";

interface MatriculaRestaurarMenuItemProps {
	id: string;
	pessoaId: string;
}

/** Desfaz um "Encerrar" por engano — reversível na hora, sem confirmação (pode encerrar de novo se for o caso). */
export function MatriculaRestaurarMenuItem({ id, pessoaId }: MatriculaRestaurarMenuItemProps): React.ReactElement {
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
		<DropdownMenuItem onSelect={(event) => event.preventDefault()} onClick={handleRestaurar} disabled={isPending}>
			{erro ?? "Restaurar matrícula"}
		</DropdownMenuItem>
	);
}
