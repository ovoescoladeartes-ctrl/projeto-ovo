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

import { encerrarMatricula } from "./actions";

interface MatriculaEncerrarButtonProps {
	id: string;
	pessoaId: string;
}

/** Confirmação leve (sem digitar nome) — mesmo padrão do "Arquivar" pessoa, reservando o padrão de digitar o nome só pra exclusão permanente. */
export function MatriculaEncerrarButton({ id, pessoaId }: MatriculaEncerrarButtonProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	function handleEncerrar(): void {
		startTransition(async () => {
			await encerrarMatricula({ id, pessoaId });
			setOpen(false);
		});
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button type="button" variant="ghost" size="sm">
					Encerrar
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Encerrar essa matrícula?</AlertDialogTitle>
					<AlertDialogDescription>A pessoa deixa de aparecer como matriculada nessa turma — pode ser restaurada depois.</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<Button type="button" variant="destructive" onClick={handleEncerrar} disabled={isPending}>
						{isPending ? "Encerrando..." : "Encerrar"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
