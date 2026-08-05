"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { inativarPessoa } from "./actions";

interface PessoaRowActionsProps {
	id: string;
}

export function PessoaRowActions({ id }: PessoaRowActionsProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();

	function handleInativar(): void {
		startTransition(async () => {
			await inativarPessoa(id);
		});
	}

	return (
		<Button type="button" variant="ghost" size="sm" onClick={handleInativar} disabled={isPending}>
			{isPending ? "Inativando..." : "Inativar"}
		</Button>
	);
}
