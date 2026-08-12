"use client";

import { Archive } from "lucide-react";
import { useState, useTransition } from "react";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { inativarPessoa } from "./actions";

interface PessoaArquivarButtonProps {
	id: string;
	nome: string;
}

/**
 * Ação de linha na listagem — `inativarPessoa` já checa o motivo de bloqueio internamente e
 * devolve a mensagem pronta, então não precisa do fluxo em duas fases que `PessoaExcluirButton` usa.
 */
export function PessoaArquivarButton({ id, nome }: PessoaArquivarButtonProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleOpenChange(novoOpen: boolean): void {
		setOpen(novoOpen);
		if (novoOpen) {
			setErro(null);
		}
	}

	function handleArquivar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await inativarPessoa(id);
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível arquivar.");
				return;
			}
			setOpen(false);
		});
	}

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="rounded-lg text-danger hover:bg-danger/10 hover:text-danger"
					aria-label={`Arquivar ${nome}`}
						title={`Arquivar ${nome}`}
				>
					<Archive className="h-4 w-4" strokeWidth={2.4} />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Arquivar {nome}?</AlertDialogTitle>
					<AlertDialogDescription>A pessoa some da lista principal, mas o histórico continua acessível.</AlertDialogDescription>
				</AlertDialogHeader>
				{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<Button type="button" variant="destructive" onClick={handleArquivar} disabled={isPending}>
						{isPending ? "Arquivando..." : "Arquivar"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
