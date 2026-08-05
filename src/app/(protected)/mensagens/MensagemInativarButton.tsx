"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { inativarMensagem } from "./actions";

interface MensagemInativarButtonProps {
	id: string;
}

export function MensagemInativarButton({ id }: MensagemInativarButtonProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();

	function handleInativar(): void {
		startTransition(async () => {
			await inativarMensagem(id);
		});
	}

	return (
		<Button type="button" variant="ghost" size="sm" onClick={handleInativar} disabled={isPending}>
			{isPending ? "Inativando..." : "Inativar"}
		</Button>
	);
}
