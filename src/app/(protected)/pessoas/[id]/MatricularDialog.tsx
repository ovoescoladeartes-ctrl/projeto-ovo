"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseCentavosInput } from "@/lib/currency";

import { matricular } from "./actions";

interface TurmaOpcao {
	id: string;
	nome: string;
	mensalidadeCentavos: number;
}

interface MatricularDialogProps {
	pessoaId: string;
	turmas: TurmaOpcao[];
}

function hoje(): string {
	return new Date().toISOString().slice(0, 10);
}

function centavosParaInput(centavos: number): string {
	return (centavos / 100).toFixed(2).replace(".", ",");
}

export function MatricularDialog({ pessoaId, turmas }: MatricularDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [turmaId, setTurmaId] = useState(turmas[0]?.id ?? "");
	const [dataMatricula, setDataMatricula] = useState(hoje());
	const [mensalidade, setMensalidade] = useState(centavosParaInput(turmas[0]?.mensalidadeCentavos ?? 0));
	const [motivo, setMotivo] = useState("");
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleTurmaChange(novoTurmaId: string): void {
		setTurmaId(novoTurmaId);
		const turma = turmas.find((item) => item.id === novoTurmaId);
		setMensalidade(centavosParaInput(turma?.mensalidadeCentavos ?? 0));
	}

	function handleSalvar(): void {
		setErro(null);

		const mensalidadeCombinadaCentavos = parseCentavosInput(mensalidade);
		if (mensalidadeCombinadaCentavos === null) {
			setErro("Mensalidade inválida.");
			return;
		}

		startTransition(async () => {
			const result = await matricular({
				pessoaId,
				turmaId,
				dataMatricula,
				mensalidadeCombinadaCentavos,
				motivo: motivo.trim() === "" ? null : motivo.trim(),
			});
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível matricular.");
				return;
			}
			setOpen(false);
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm" disabled={turmas.length === 0}>
					Matricular
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Matricular</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="matricula-turma">Turma</Label>
						<Select value={turmaId} onValueChange={handleTurmaChange} disabled={isPending}>
							<SelectTrigger id="matricula-turma">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{turmas.map((turma) => (
									<SelectItem key={turma.id} value={turma.id}>
										{turma.nome}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="matricula-data">Data da matrícula</Label>
						<Input
							id="matricula-data"
							type="date"
							value={dataMatricula}
							onChange={(event) => setDataMatricula(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="matricula-mensalidade">Mensalidade combinada (R$)</Label>
						<Input
							id="matricula-mensalidade"
							inputMode="decimal"
							value={mensalidade}
							onChange={(event) => setMensalidade(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="matricula-motivo">Motivo (opcional)</Label>
						<Input
							id="matricula-motivo"
							placeholder="Ex.: bolsa, permuta, desconto combinado"
							value={motivo}
							onChange={(event) => setMotivo(event.target.value)}
							disabled={isPending}
						/>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button type="button" onClick={handleSalvar} disabled={isPending || turmaId === ""}>
						{isPending ? "Matriculando..." : "Matricular"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
