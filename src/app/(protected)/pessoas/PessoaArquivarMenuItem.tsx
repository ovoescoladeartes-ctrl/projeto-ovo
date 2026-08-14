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

import { inativarPessoa, verificarBloqueioArquivarPessoa } from "./actions";

type Fase = "carregando" | "bloqueado" | "confirmar";

interface PessoaArquivarMenuItemProps {
	id: string;
	nome: string;
	onArquivado?: () => void;
}

/**
 * Item do menu overflow da linha — mesmo padrão de duas fases do `PessoaExcluirMenuItem`: checa o
 * bloqueio (matrícula ativa / educador de turma ativa) antes de mostrar a confirmação, em vez de
 * deixar o usuário confirmar "Arquivar?" e só então descobrir que a ação foi recusada. `onSelect`
 * com preventDefault pra não brigar com o fechamento do DropdownMenu na abertura do AlertDialog.
 */
export function PessoaArquivarMenuItem({ id, nome, onArquivado }: PessoaArquivarMenuItemProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [fase, setFase] = useState<Fase>("carregando");
	const [motivoBloqueio, setMotivoBloqueio] = useState<string | null>(null);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleOpenChange(novoOpen: boolean): void {
		setOpen(novoOpen);
		if (!novoOpen) {
			return;
		}
		setFase("carregando");
		setMotivoBloqueio(null);
		setErro(null);
		startTransition(async () => {
			const resultado = await verificarBloqueioArquivarPessoa(id);
			if (resultado.bloqueado) {
				setMotivoBloqueio(resultado.motivo);
				setFase("bloqueado");
			} else {
				setFase("confirmar");
			}
		});
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
			onArquivado?.();
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
				{fase === "carregando" ? (
					<AlertDialogHeader>
						<AlertDialogTitle>Verificando...</AlertDialogTitle>
						<AlertDialogDescription>Checando matrículas e turmas ativas ligadas a {nome}.</AlertDialogDescription>
					</AlertDialogHeader>
				) : fase === "bloqueado" ? (
					<>
						<AlertDialogHeader>
							<AlertDialogTitle>Não é possível arquivar {nome}</AlertDialogTitle>
							<AlertDialogDescription>{motivoBloqueio}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Entendi</AlertDialogCancel>
						</AlertDialogFooter>
					</>
				) : (
					<>
						<AlertDialogHeader>
							<AlertDialogTitle>Arquivar {nome}?</AlertDialogTitle>
							<AlertDialogDescription>
								A pessoa some da lista principal, mas o histórico continua acessível.
							</AlertDialogDescription>
						</AlertDialogHeader>
						{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
							<Button type="button" variant="destructive" onClick={handleArquivar} disabled={isPending}>
								{isPending ? "Arquivando..." : "Arquivar"}
							</Button>
						</AlertDialogFooter>
					</>
				)}
			</AlertDialogContent>
		</AlertDialog>
	);
}
