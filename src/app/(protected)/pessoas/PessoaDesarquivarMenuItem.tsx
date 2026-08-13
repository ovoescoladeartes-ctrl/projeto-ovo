"use client";

import { useState, useTransition } from "react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { reativarPessoa } from "./actions";

interface PessoaDesarquivarMenuItemProps {
	id: string;
	nome: string;
}

/**
 * Sem confirmação — reversível na hora, a pessoa pode ser arquivada de novo se for engano.
 * `onSelect` com preventDefault só pra manter o menu aberto se der erro (senão a mensagem nunca
 * seria vista, já que o menu fecharia sozinho no clique).
 */
export function PessoaDesarquivarMenuItem({ id, nome }: PessoaDesarquivarMenuItemProps): React.ReactElement {
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleDesarquivar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await reativarPessoa(id);
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível desarquivar.");
			}
		});
	}

	return (
		<DropdownMenuItem
			onSelect={(event) => event.preventDefault()}
			onClick={handleDesarquivar}
			disabled={isPending}
			aria-label={`Desarquivar ${nome}`}
		>
			{erro ?? "Desarquivar pessoa"}
		</DropdownMenuItem>
	);
}
