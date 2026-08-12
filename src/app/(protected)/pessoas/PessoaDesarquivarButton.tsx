"use client";

import { ArchiveRestore } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { reativarPessoa } from "./actions";

interface PessoaDesarquivarButtonProps {
	id: string;
	nome: string;
}

/** Sem confirmação — reversível na hora, a pessoa pode ser arquivada de novo se for engano. */
export function PessoaDesarquivarButton({ id, nome }: PessoaDesarquivarButtonProps): React.ReactElement {
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
		<span className="inline-flex items-center gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-6 w-6 rounded-lg"
				onClick={handleDesarquivar}
				disabled={isPending}
				aria-label={`Desarquivar ${nome}`}
				title={`Desarquivar ${nome}`}
			>
				<ArchiveRestore className="h-3.5 w-3.5" strokeWidth={2.4} />
			</Button>
			{erro !== null ? <span className="text-xs text-destructive">{erro}</span> : null}
		</span>
	);
}
