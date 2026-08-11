"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { InteresseTagsInput } from "@/components/InteresseTagsInput";
import { buscarPessoas, type PessoaBusca } from "@/core/pessoas/actions";

import { criarPessoa } from "./actions";

interface NovaPessoaDialogProps {
	opcoesInteresse: string[];
}

function papeisDe(pessoa: PessoaBusca): string {
	return [pessoa.ehAluno ? "Aluno" : null, pessoa.ehProfessor ? "Professor" : null].filter(Boolean).join(", ");
}

export function NovaPessoaDialog({ opcoesInteresse }: NovaPessoaDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [nome, setNome] = useState("");
	const [ehAluno, setEhAluno] = useState(true);
	const [ehProfessor, setEhProfessor] = useState(false);
	const [interesses, setInteresses] = useState<string[]>([]);
	const [duplicatas, setDuplicatas] = useState<PessoaBusca[]>([]);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [, startBusca] = useTransition();

	// Busca de duplicata por nome parecido enquanto digita — mesmo padrão de debounce que o
	// PessoaCombobox já usa, aviso não-bloqueante, nunca impede o cadastro de continuar.
	useEffect(() => {
		const termo = nome.trim();
		if (termo.length < 2) {
			setDuplicatas([]);
			return;
		}
		const timer = setTimeout(() => {
			startBusca(async () => {
				const encontradas = await buscarPessoas(termo);
				setDuplicatas(encontradas);
			});
		}, 200);
		return () => clearTimeout(timer);
	}, [nome]);

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await criarPessoa({ nome, ehAluno, ehProfessor, interesses });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			setNome("");
			setEhAluno(true);
			setEhProfessor(false);
			setInteresses([]);
			setDuplicatas([]);
		});
	}

	const papeisSelecionados: Array<"aluno" | "professor"> = [
		...(ehAluno ? (["aluno"] as const) : []),
		...(ehProfessor ? (["professor"] as const) : []),
	];

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
						{duplicatas.map((match) => {
							const papelSugerido = papeisSelecionados.find((papel) =>
								papel === "aluno" ? !match.ehAluno : !match.ehProfessor,
							);
							return (
								<p key={match.id} className="text-xs text-amber-600">
									Já existe {match.nome} ({papeisDe(match)}).
									{papelSugerido !== undefined ? (
										<>
											{" "}
											Quer adicionar {papelSugerido === "aluno" ? "Aluno" : "Professor"} a essa pessoa em vez de
											criar um cadastro novo?{" "}
											<Link href={`/pessoas/${match.id}?papelParaAdicionar=${papelSugerido}`} className="underline">
												Ver pessoa
											</Link>
										</>
									) : null}
								</p>
							);
						})}
					</div>

					<div className="space-y-1.5">
						<Label>Papel</Label>
						<div className="flex flex-wrap gap-4">
							<div className="flex items-center gap-2">
								<Checkbox
									id="pessoa-eh-aluno"
									checked={ehAluno}
									onCheckedChange={(checked) => setEhAluno(checked === true)}
									disabled={isPending}
								/>
								<Label htmlFor="pessoa-eh-aluno" className="font-normal">
									Aluno
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<Checkbox
									id="pessoa-eh-professor"
									checked={ehProfessor}
									onCheckedChange={(checked) => setEhProfessor(checked === true)}
									disabled={isPending}
								/>
								<Label htmlFor="pessoa-eh-professor" className="font-normal">
									Professor
								</Label>
							</div>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label>Interesses</Label>
						<InteresseTagsInput value={interesses} onChange={setInteresses} opcoes={opcoesInteresse} disabled={isPending} />
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						onClick={handleSalvar}
						disabled={isPending || nome.trim() === "" || (!ehAluno && !ehProfessor)}
					>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
