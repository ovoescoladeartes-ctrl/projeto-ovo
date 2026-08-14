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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { excluirTurmaPermanentemente, verificarBloqueioExclusaoTurma } from "./actions";

type Fase = "carregando" | "bloqueado" | "confirmar";

interface TurmaExcluirMenuItemProps {
	id: string;
	nome: string;
}

export function TurmaExcluirMenuItem({ id, nome }: TurmaExcluirMenuItemProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [fase, setFase] = useState<Fase>("carregando");
	const [motivoBloqueio, setMotivoBloqueio] = useState<string | null>(null);
	const [textoConfirmacao, setTextoConfirmacao] = useState("");
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleOpenChange(novoOpen: boolean): void {
		setOpen(novoOpen);
		if (!novoOpen) {
			return;
		}
		setFase("carregando");
		setMotivoBloqueio(null);
		setTextoConfirmacao("");
		setErro(null);
		startTransition(async () => {
			const resultado = await verificarBloqueioExclusaoTurma(id);
			if (resultado.bloqueado) {
				setMotivoBloqueio(resultado.motivo);
				setFase("bloqueado");
			} else {
				setFase("confirmar");
			}
		});
	}

	function handleExcluir(): void {
		setErro(null);
		startTransition(async () => {
			const result = await excluirTurmaPermanentemente(id);
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível excluir.");
				return;
			}
			setOpen(false);
		});
	}

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogTrigger asChild>
				<DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-danger focus:text-danger">
					Excluir permanentemente
				</DropdownMenuItem>
			</AlertDialogTrigger>
			<AlertDialogContent>
				{fase === "carregando" ? (
					<AlertDialogHeader>
						<AlertDialogTitle>Verificando...</AlertDialogTitle>
						<AlertDialogDescription>Checando se há matrículas ligadas a essa turma.</AlertDialogDescription>
					</AlertDialogHeader>
				) : fase === "bloqueado" ? (
					<>
						<AlertDialogHeader>
							<AlertDialogTitle>Não é possível excluir {nome}</AlertDialogTitle>
							<AlertDialogDescription>{motivoBloqueio}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Entendi</AlertDialogCancel>
						</AlertDialogFooter>
					</>
				) : (
					<>
						<AlertDialogHeader>
							<AlertDialogTitle>Excluir {nome} permanentemente?</AlertDialogTitle>
							<AlertDialogDescription>
								Essa ação não pode ser desfeita. Para confirmar, digite o nome exatamente como aparece:{" "}
								<strong>{nome}</strong>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="space-y-1.5">
							<Label htmlFor={`excluir-confirmacao-${id}`}>Nome da turma</Label>
							<Input
								id={`excluir-confirmacao-${id}`}
								value={textoConfirmacao}
								onChange={(event) => setTextoConfirmacao(event.target.value)}
								disabled={isPending}
							/>
						</div>
						{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
							<Button
								type="button"
								variant="destructive"
								onClick={handleExcluir}
								disabled={isPending || textoConfirmacao.trim() !== nome}
							>
								{isPending ? "Excluindo..." : "Excluir"}
							</Button>
						</AlertDialogFooter>
					</>
				)}
			</AlertDialogContent>
		</AlertDialog>
	);
}
