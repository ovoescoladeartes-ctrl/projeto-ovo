"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Matricula } from "@/core/matriculas/schema";
import { formatCentavos, parseCentavosInput } from "@/lib/currency";

import { atualizarMatricula } from "./actions";

function centavosParaInput(centavos: number): string {
	return (centavos / 100).toFixed(2).replace(".", ",");
}

interface MatriculaEditDialogProps {
	matricula: Matricula;
	turmaNome: string;
}

export function MatriculaEditDialog({ matricula, turmaNome }: MatriculaEditDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [mensalidade, setMensalidade] = useState(centavosParaInput(matricula.mensalidadeCombinadaCentavos));
	const [motivo, setMotivo] = useState(matricula.motivo ?? "");
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);

		const mensalidadeCombinadaCentavos = parseCentavosInput(mensalidade);
		if (mensalidadeCombinadaCentavos === null) {
			setErro("Mensalidade inválida.");
			return;
		}

		startTransition(async () => {
			const result = await atualizarMatricula({
				id: matricula.id,
				pessoaId: matricula.pessoaId,
				mensalidadeCombinadaCentavos,
				motivo: motivo.trim() === "" ? null : motivo.trim(),
			});
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm">
					<Pencil className="h-4 w-4" />
					Editar
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Editar matrícula — {turmaNome}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor={`matricula-mensalidade-${matricula.id}`}>Mensalidade combinada (R$)</Label>
						<Input
							id={`matricula-mensalidade-${matricula.id}`}
							inputMode="decimal"
							value={mensalidade}
							onChange={(event) => setMensalidade(event.target.value)}
							disabled={isPending}
						/>
						<p className="text-xs text-muted-foreground">Valor original: {formatCentavos(matricula.mensalidadeCombinadaCentavos)}</p>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`matricula-motivo-${matricula.id}`}>Motivo (opcional)</Label>
						<Input
							id={`matricula-motivo-${matricula.id}`}
							placeholder="Ex.: bolsa, permuta, desconto combinado"
							value={motivo}
							onChange={(event) => setMotivo(event.target.value)}
							disabled={isPending}
						/>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline" disabled={isPending}>
							Cancelar
						</Button>
					</DialogClose>
					<Button type="button" onClick={handleSalvar} disabled={isPending}>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
