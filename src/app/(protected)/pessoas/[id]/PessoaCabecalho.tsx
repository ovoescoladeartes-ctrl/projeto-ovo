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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InteresseTagsInput } from "@/components/InteresseTagsInput";
import type { Pessoa, PessoaTipo } from "@/core/pessoas/schema";

import { atualizarPessoa, inativarPessoa } from "../actions";

const TIPO_LABEL: Record<PessoaTipo, string> = {
	aluno: "Aluno",
	colaborador: "Colaborador",
};

interface PessoaCabecalhoProps {
	pessoa: Pessoa;
	opcoesInteresse: string[];
}

export function PessoaCabecalho({ pessoa, opcoesInteresse }: PessoaCabecalhoProps): React.ReactElement {
	const [modoEdicao, setModoEdicao] = useState(false);
	const [nome, setNome] = useState(pessoa.nome);
	const [interesses, setInteresses] = useState<string[]>(pessoa.interesses);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const [arquivarOpen, setArquivarOpen] = useState(false);
	const [arquivarErro, setArquivarErro] = useState<string | null>(null);
	const [isArquivando, startArquivarTransition] = useTransition();

	function handleCancelar(): void {
		setNome(pessoa.nome);
		setInteresses(pessoa.interesses);
		setErro(null);
		setModoEdicao(false);
	}

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await atualizarPessoa({ id: pessoa.id, nome, interesses });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setModoEdicao(false);
		});
	}

	function handleArquivar(): void {
		setArquivarErro(null);
		startArquivarTransition(async () => {
			const result = await inativarPessoa(pessoa.id);
			if (result.status === "error") {
				setArquivarErro(result.message ?? "Não foi possível arquivar.");
				return;
			}
			setArquivarOpen(false);
		});
	}

	const subtitulo = (
		<p className="text-sm text-muted-foreground">
			{TIPO_LABEL[pessoa.tipo]}
			{pessoa.ativo ? "" : " · arquivado"}
			{pessoa.numeroMatricula !== null ? ` · ${pessoa.numeroMatricula}` : ""}
		</p>
	);

	if (!modoEdicao) {
		return (
			<div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground sm:text-3xl">{pessoa.nome}</h1>
					{subtitulo}
					{pessoa.interesses.length > 0 ? (
						<div className="mt-3 flex flex-wrap gap-1.5">
							{pessoa.interesses.map((interesse) => (
								<Badge key={interesse} variant="outline">
									{interesse}
								</Badge>
							))}
						</div>
					) : null}
				</div>
				<Button type="button" variant="outline" size="sm" onClick={() => setModoEdicao(true)}>
					Editar
				</Button>
			</div>
		);
	}

	return (
		<div className="mt-3 mb-6 rounded-lg border border-border bg-card p-4">
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
					<Label>Interesses</Label>
					<InteresseTagsInput value={interesses} onChange={setInteresses} opcoes={opcoesInteresse} disabled={isPending} />
				</div>

				{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-2">
				{pessoa.ativo ? (
					<AlertDialog open={arquivarOpen} onOpenChange={setArquivarOpen}>
						<AlertDialogTrigger asChild>
							<Button type="button" variant="ghost" className="text-muted-foreground">
								Arquivar
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Arquivar {pessoa.nome}?</AlertDialogTitle>
								<AlertDialogDescription>
									A pessoa some da lista principal, mas o histórico continua acessível.
								</AlertDialogDescription>
							</AlertDialogHeader>
							{arquivarErro !== null ? <p className="text-xs text-destructive">{arquivarErro}</p> : null}
							<AlertDialogFooter>
								<AlertDialogCancel disabled={isArquivando}>Cancelar</AlertDialogCancel>
								<Button type="button" variant="destructive" onClick={handleArquivar} disabled={isArquivando}>
									{isArquivando ? "Arquivando..." : "Arquivar"}
								</Button>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				) : (
					<span />
				)}
				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={handleCancelar} disabled={isPending}>
						Cancelar
					</Button>
					<Button type="button" onClick={handleSalvar} disabled={isPending || nome.trim() === ""}>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</div>
			</div>
		</div>
	);
}
