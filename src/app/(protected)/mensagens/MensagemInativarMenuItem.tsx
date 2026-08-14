"use client";

import { useState, useTransition } from "react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { inativarMensagem } from "./actions";

interface MensagemInativarMenuItemProps {
	id: string;
}

export function MensagemInativarMenuItem({ id }: MensagemInativarMenuItemProps): React.ReactElement {
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleInativar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await inativarMensagem(id);
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível inativar.");
			}
		});
	}

	return (
		<DropdownMenuItem onSelect={(event) => event.preventDefault()} onClick={handleInativar} disabled={isPending}>
			{erro ?? "Inativar mensagem"}
		</DropdownMenuItem>
	);
}
