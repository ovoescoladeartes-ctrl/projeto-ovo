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

import { matricular } from "./actions";

interface TurmaOpcao {
	id: string;
	nome: string;
}

interface MatricularDialogProps {
	pessoaId: string;
	turmas: TurmaOpcao[];
}

function hoje(): string {
	return new Date().toISOString().slice(0, 10);
}

export function MatricularDialog({ pessoaId, turmas }: MatricularDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [turmaId, setTurmaId] = useState(turmas[0]?.id ?? "");
	const [dataMatricula, setDataMatricula] = useState(hoje());
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await matricular({ pessoaId, turmaId, dataMatricula });
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
						<select
							id="matricula-turma"
							value={turmaId}
							onChange={(event) => setTurmaId(event.target.value)}
							disabled={isPending}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
						>
							{turmas.map((turma) => (
								<option key={turma.id} value={turma.id}>
									{turma.nome}
								</option>
							))}
						</select>
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
