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
import { ALUNO_STATUS, COLABORADOR_STATUS, type PessoaTipo } from "@/core/pessoas/schema";

import { criarPessoa } from "./actions";

const STATUS_LABELS: Record<string, string> = {
	lead: "Lead",
	matriculado: "Matriculado",
	ativo: "Ativo",
	banco_talentos: "Banco de talentos",
};

const STATUS_POR_TIPO: Record<PessoaTipo, readonly string[]> = {
	aluno: ALUNO_STATUS,
	colaborador: COLABORADOR_STATUS,
};

export function NovaPessoaDialog(): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [tipo, setTipo] = useState<PessoaTipo>("aluno");
	const [nome, setNome] = useState("");
	const [status, setStatus] = useState<string>(ALUNO_STATUS[0]);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleTipoChange(novoTipo: PessoaTipo): void {
		setTipo(novoTipo);
		setStatus(STATUS_POR_TIPO[novoTipo][0] ?? "");
	}

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await criarPessoa({ tipo, nome, status });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			setNome("");
			setTipo("aluno");
			setStatus(ALUNO_STATUS[0]);
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button">Nova pessoa</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Nova pessoa</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="pessoa-nome">Nome</Label>
						<Input
							id="pessoa-nome"
							value={nome}
							onChange={(event) => setNome(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="pessoa-tipo">Tipo</Label>
						<select
							id="pessoa-tipo"
							value={tipo}
							onChange={(event) => handleTipoChange(event.target.value as PessoaTipo)}
							disabled={isPending}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
						>
							<option value="aluno">Aluno</option>
							<option value="colaborador">Colaborador</option>
						</select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="pessoa-status">Status</Label>
						<select
							id="pessoa-status"
							value={status}
							onChange={(event) => setStatus(event.target.value)}
							disabled={isPending}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
						>
							{STATUS_POR_TIPO[tipo].map((opcao) => (
								<option key={opcao} value={opcao}>
									{STATUS_LABELS[opcao]}
								</option>
							))}
						</select>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button type="button" onClick={handleSalvar} disabled={isPending || nome.trim() === ""}>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
