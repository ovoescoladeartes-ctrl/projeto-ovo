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

import { inativarTurma } from "./actions";

interface TurmaArquivarMenuItemProps {
	id: string;
	nome: string;
	onArquivado?: () => void;
}

export function TurmaArquivarMenuItem({ id, nome, onArquivado }: TurmaArquivarMenuItemProps): React.ReactElement {
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
			const result = await inativarTurma(id);
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível arquivar.");
				return;
			}
			setOpen(false);
			onArquivado?.();
		});
	}

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogTrigger asChild>
				<DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-danger focus:text-danger">
					Arquivar turma
				</DropdownMenuItem>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Arquivar {nome}?</AlertDialogTitle>
					<AlertDialogDescription>As matrículas ativas dessa turma serão encerradas junto.</AlertDialogDescription>
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
