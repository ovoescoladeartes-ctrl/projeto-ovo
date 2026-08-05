"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALUNO_STATUS, COLABORADOR_STATUS, type Pessoa } from "@/core/pessoas/schema";

import { atualizarPessoa, inativarPessoa } from "../actions";

const STATUS_LABELS: Record<string, string> = {
	lead: "Lead",
	matriculado: "Matriculado",
	ativo: "Ativo",
	banco_talentos: "Banco de talentos",
};

interface PessoaEditFormProps {
	pessoa: Pessoa;
}

export function PessoaEditForm({ pessoa }: PessoaEditFormProps): React.ReactElement {
	const router = useRouter();
	const [nome, setNome] = useState(pessoa.nome);
	const [status, setStatus] = useState(pessoa.status);
	const [erro, setErro] = useState<string | null>(null);
	const [salvo, setSalvo] = useState(false);
	const [isPending, startTransition] = useTransition();

	const statusOpcoes = pessoa.tipo === "aluno" ? ALUNO_STATUS : COLABORADOR_STATUS;

	function handleSalvar(): void {
		setErro(null);
		setSalvo(false);
		startTransition(async () => {
			const result = await atualizarPessoa({ id: pessoa.id, nome, status });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setSalvo(true);
		});
	}

	function handleInativar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await inativarPessoa(pessoa.id);
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível inativar.");
				return;
			}
			router.push("/pessoas");
		});
	}

	return (
		<div className="max-w-sm space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor="pessoa-nome">Nome</Label>
				<Input
					id="pessoa-nome"
					value={nome}
					onChange={(event) => {
						setNome(event.target.value);
						setSalvo(false);
					}}
					disabled={isPending}
				/>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="pessoa-status">Status</Label>
				<select
					id="pessoa-status"
					value={status}
					onChange={(event) => {
						setStatus(event.target.value);
						setSalvo(false);
					}}
					disabled={isPending}
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
				>
					{statusOpcoes.map((opcao) => (
						<option key={opcao} value={opcao}>
							{STATUS_LABELS[opcao]}
						</option>
					))}
				</select>
			</div>

			{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
			{salvo ? <p className="text-xs text-muted-foreground">Alterações salvas.</p> : null}

			<div className="flex gap-2 pt-2">
				<Button type="button" onClick={handleSalvar} disabled={isPending || nome.trim() === ""}>
					{isPending ? "Salvando..." : "Salvar"}
				</Button>
				{pessoa.ativo ? (
					<Button type="button" variant="outline" onClick={handleInativar} disabled={isPending}>
						Inativar
					</Button>
				) : null}
			</div>
		</div>
	);
}
