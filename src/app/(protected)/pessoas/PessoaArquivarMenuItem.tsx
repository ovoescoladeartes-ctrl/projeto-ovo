"use client";

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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { inativarPessoa } from "./actions";

interface PessoaArquivarMenuItemProps {
	id: string;
	nome: string;
}

/**
 * Item do menu overflow da linha — `inativarPessoa` já checa o motivo de bloqueio internamente e
 * devolve a mensagem pronta, então não precisa do fluxo em duas fases que `PessoaExcluirButton` usa.
 * `onSelect` com preventDefault pra não brigar com o fechamento do DropdownMenu na abertura do
 * AlertDialog (padrão shadcn pra "item de menu que abre diálogo").
 */
export function PessoaArquivarMenuItem({ id, nome }: PessoaArquivarMenuItemProps): React.ReactElement {
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
				<DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-danger focus:text-danger">
					Arquivar pessoa
				</DropdownMenuItem>
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
