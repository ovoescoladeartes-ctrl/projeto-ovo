"use client";

import { MoreVertical, Pencil } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InteresseTagsInput } from "@/components/InteresseTagsInput";
import type { Pessoa } from "@/core/pessoas/schema";

import { atualizarPessoa } from "../actions";
import { PapelDropdown } from "../PapelDropdown";
import { PessoaArquivarMenuItem } from "../PessoaArquivarMenuItem";
import { PessoaExcluirMenuItem } from "../PessoaExcluirMenuItem";

interface PessoaEditDialogProps {
	pessoa: Pessoa;
	opcoesInteresse: string[];
	isAdmin: boolean;
	papelParaAdicionarInicial: "aluno" | "professor" | null;
}

function rotuloInteresses(ehAluno: boolean, ehProfessor: boolean): string {
	if (ehAluno && ehProfessor) {
		return "Interesses / Especialidade";
	}
	return ehProfessor ? "Especialidade" : "Interesses";
}

export function PessoaEditDialog({
	pessoa,
	opcoesInteresse,
	isAdmin,
	papelParaAdicionarInicial,
}: PessoaEditDialogProps): React.ReactElement {
	const [open, setOpen] = useState(papelParaAdicionarInicial !== null);
	const [nome, setNome] = useState(pessoa.nome);
	const [ehAluno, setEhAluno] = useState(pessoa.ehAluno || papelParaAdicionarInicial === "aluno");
	const [ehProfessor, setEhProfessor] = useState(pessoa.ehProfessor || papelParaAdicionarInicial === "professor");
	const [interesses, setInteresses] = useState<string[]>(pessoa.interesses);
	const [email, setEmail] = useState(pessoa.email ?? "");
	const [telefone, setTelefone] = useState(pessoa.telefone ?? "");
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const temAcoesExtras = pessoa.ativo || isAdmin;

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await atualizarPessoa({
				id: pessoa.id,
				nome,
				interesses,
				ehAluno,
				ehProfessor,
				email: email.trim() === "" ? null : email.trim(),
				telefone: telefone.trim() === "" ? null : telefone.trim(),
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
					<DialogTitle>Editar pessoa</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor={`pessoa-nome-${pessoa.id}`}>Nome</Label>
						<Input
							id={`pessoa-nome-${pessoa.id}`}
							value={nome}
							onChange={(event) => setNome(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label>Papel</Label>
						<PapelDropdown
							ehAluno={ehAluno}
							ehProfessor={ehProfessor}
							onChange={(papel, marcado) => (papel === "aluno" ? setEhAluno(marcado) : setEhProfessor(marcado))}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`pessoa-email-${pessoa.id}`}>Email</Label>
						<Input
							id={`pessoa-email-${pessoa.id}`}
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`pessoa-telefone-${pessoa.id}`}>Telefone</Label>
						<Input
							id={`pessoa-telefone-${pessoa.id}`}
							value={telefone}
							onChange={(event) => setTelefone(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label>{rotuloInteresses(ehAluno, ehProfessor)}</Label>
						<InteresseTagsInput value={interesses} onChange={setInteresses} opcoes={opcoesInteresse} disabled={isPending} />
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline" disabled={isPending}>
							Cancelar
						</Button>
					</DialogClose>
					<Button
						type="button"
						onClick={handleSalvar}
						disabled={isPending || nome.trim() === "" || (!ehAluno && !ehProfessor)}
					>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
					{temAcoesExtras ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									title="Mais ações"
									aria-label="Mais ações"
									className="ml-auto sm:ml-0"
								>
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{pessoa.ativo ? (
									<PessoaArquivarMenuItem id={pessoa.id} nome={pessoa.nome} onArquivado={() => setOpen(false)} />
								) : isAdmin ? (
									<PessoaExcluirMenuItem id={pessoa.id} nome={pessoa.nome} onExcluido={() => setOpen(false)} />
								) : null}
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
