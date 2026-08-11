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
import { InteresseTagsInput } from "@/components/InteresseTagsInput";
import { ALUNO_STATUS, COLABORADOR_STATUS, type PessoaTipo } from "@/core/pessoas/schema";

import { criarPessoa } from "./actions";

const STATUS_LABELS: Record<string, string> = {
	lead: "Lead",
	matriculado: "Matriculado",
};

/**
 * Status inicial ao criar. Aluno ainda escolhe entre Lead/Matriculado na hora do cadastro;
 * colaborador não tem escolha — sempre começa em "banco_talentos" (equivalente a lead), já que
 * só fica "ativo" quando `recalcularStatusColaborador` o associar a uma Turma ativa como educador.
 */
const STATUS_INICIAL_COLABORADOR: (typeof COLABORADOR_STATUS)[number] = "banco_talentos";

interface NovaPessoaDialogProps {
	opcoesInteresse: string[];
}

export function NovaPessoaDialog({ opcoesInteresse }: NovaPessoaDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [tipo, setTipo] = useState<PessoaTipo>("aluno");
	const [nome, setNome] = useState("");
	const [status, setStatus] = useState<string>(ALUNO_STATUS[0]);
	const [interesses, setInteresses] = useState<string[]>([]);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleTipoChange(novoTipo: PessoaTipo): void {
		setTipo(novoTipo);
		setStatus(novoTipo === "aluno" ? ALUNO_STATUS[0] : STATUS_INICIAL_COLABORADOR);
	}

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const statusFinal = tipo === "aluno" ? status : STATUS_INICIAL_COLABORADOR;
			const result = await criarPessoa({ tipo, nome, status: statusFinal, interesses });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			setNome("");
			setTipo("aluno");
			setStatus(ALUNO_STATUS[0]);
			setInteresses([]);
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
						<Select value={tipo} onValueChange={(value) => handleTipoChange(value as PessoaTipo)} disabled={isPending}>
							<SelectTrigger id="pessoa-tipo">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="aluno">Aluno</SelectItem>
								<SelectItem value="colaborador">Colaborador</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{tipo === "aluno" ? (
						<div className="space-y-1.5">
							<Label htmlFor="pessoa-status">Status</Label>
							<Select value={status} onValueChange={setStatus} disabled={isPending}>
								<SelectTrigger id="pessoa-status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ALUNO_STATUS.map((opcao) => (
										<SelectItem key={opcao} value={opcao}>
											{STATUS_LABELS[opcao]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					) : null}

					<div className="space-y-1.5">
						<Label>Interesses</Label>
						<InteresseTagsInput value={interesses} onChange={setInteresses} opcoes={opcoesInteresse} disabled={isPending} />
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
