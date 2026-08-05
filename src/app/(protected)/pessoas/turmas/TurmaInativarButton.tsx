"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { inativarTurma } from "./actions";

interface TurmaInativarButtonProps {
	id: string;
}

export function TurmaInativarButton({ id }: TurmaInativarButtonProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();

	function handleInativar(): void {
		startTransition(async () => {
			await inativarTurma(id);
		});
	}

	return (
		<Button type="button" variant="ghost" size="sm" onClick={handleInativar} disabled={isPending}>
			{isPending ? "Inativando..." : "Inativar"}
		</Button>
	);
}
