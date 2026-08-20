"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

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
import { DatePicker } from "@/components/DatePicker";
import { InteresseTagsInput } from "@/components/InteresseTagsInput";
import { buscarPessoas, type PessoaBusca } from "@/core/pessoas/actions";
import { parseCentavosInput } from "@/lib/currency";

import { criarPessoa } from "./actions";
import { PapelDropdown } from "./PapelDropdown";

interface TurmaOpcao {
	id: string;
	nome: string;
	mensalidadeCentavos: number;
}

interface NovaPessoaDialogProps {
	opcoesInteresse: string[];
	turmasAtivas: TurmaOpcao[];
}

const SEM_TURMA = "__sem_turma__";

function papeisDe(pessoa: PessoaBusca): string {
	return [pessoa.ehAluno ? "Aluno" : null, pessoa.ehProfessor ? "Professor" : null].filter(Boolean).join(", ");
}

function rotuloInteresses(ehAluno: boolean, ehProfessor: boolean): string {
	if (ehAluno && ehProfessor) {
		return "Interesses / Especialidade";
	}
	return ehProfessor ? "Especialidade" : "Interesses";
}

function hoje(): string {
	return new Date().toISOString().slice(0, 10);
}

function centavosParaInput(centavos: number): string {
	return (centavos / 100).toFixed(2).replace(".", ",");
}

export function NovaPessoaDialog({ opcoesInteresse, turmasAtivas }: NovaPessoaDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [nome, setNome] = useState("");
	const [ehAluno, setEhAluno] = useState(true);
	const [ehProfessor, setEhProfessor] = useState(false);
	const [interesses, setInteresses] = useState<string[]>([]);
	const [email, setEmail] = useState("");
	const [telefone, setTelefone] = useState("");
	const [turmaId, setTurmaId] = useState(SEM_TURMA);
	const [dataMatricula, setDataMatricula] = useState(hoje());
	const [mensalidade, setMensalidade] = useState("");
	const [motivoMatricula, setMotivoMatricula] = useState("");
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

	function handleTurmaChange(novoTurmaId: string): void {
		setTurmaId(novoTurmaId);
		if (novoTurmaId === SEM_TURMA) {
			return;
		}
		const turma = turmasAtivas.find((item) => item.id === novoTurmaId);
		setMensalidade(centavosParaInput(turma?.mensalidadeCentavos ?? 0));
	}

	function handlePapelChange(papel: "aluno" | "professor", marcado: boolean): void {
		if (papel === "aluno") {
			setEhAluno(marcado);
			if (!marcado) {
				setTurmaId(SEM_TURMA);
				setMensalidade("");
				setMotivoMatricula("");
			}
			return;
		}
		setEhProfessor(marcado);
	}

	function resetarFormulario(): void {
		setNome("");
		setEhAluno(true);
		setEhProfessor(false);
		setInteresses([]);
		setEmail("");
		setTelefone("");
		setTurmaId(SEM_TURMA);
		setDataMatricula(hoje());
		setMensalidade("");
		setMotivoMatricula("");
		setDuplicatas([]);
	}

	function handleSalvar(): void {
		setErro(null);

		let matricula: {
			turmaId: string;
			dataMatricula: string;
			mensalidadeCombinadaCentavos: number;
			motivo: string | null;
		} | undefined;

		if (ehAluno && turmaId !== SEM_TURMA) {
			const mensalidadeCombinadaCentavos = parseCentavosInput(mensalidade);
			if (mensalidadeCombinadaCentavos === null) {
				setErro("Mensalidade inválida.");
				return;
			}
			matricula = {
				turmaId,
				dataMatricula,
				mensalidadeCombinadaCentavos,
				motivo: motivoMatricula.trim() === "" ? null : motivoMatricula.trim(),
			};
		}

		startTransition(async () => {
			const result = await criarPessoa({
				nome,
				ehAluno,
				ehProfessor,
				interesses,
				email: email.trim() === "" ? null : email.trim(),
				telefone: telefone.trim() === "" ? null : telefone.trim(),
				matricula,
			});
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			resetarFormulario();
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
						<Label htmlFor="pessoa-email">Email</Label>
						<Input
							id="pessoa-email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="pessoa-telefone">Telefone</Label>
						<Input
							id="pessoa-telefone"
							value={telefone}
							onChange={(event) => setTelefone(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label>Papel</Label>
						<PapelDropdown ehAluno={ehAluno} ehProfessor={ehProfessor} onChange={handlePapelChange} disabled={isPending} />
					</div>

					{ehAluno ? (
						<div className="space-y-1.5">
							<Label htmlFor="pessoa-turma">Turma (opcional)</Label>
							<Select value={turmaId} onValueChange={handleTurmaChange} disabled={isPending}>
								<SelectTrigger id="pessoa-turma">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={SEM_TURMA}>Sem turma por enquanto</SelectItem>
									{turmasAtivas.map((turma) => (
										<SelectItem key={turma.id} value={turma.id}>
											{turma.nome}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					) : null}

					{ehAluno && turmaId !== SEM_TURMA ? (
						<>
							<div className="space-y-1.5">
								<Label htmlFor="pessoa-data-matricula">Data da matrícula</Label>
								<DatePicker id="pessoa-data-matricula" value={dataMatricula} onChange={setDataMatricula} disabled={isPending} />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="pessoa-mensalidade">Mensalidade combinada (R$)</Label>
								<Input
									id="pessoa-mensalidade"
									inputMode="decimal"
									value={mensalidade}
									onChange={(event) => setMensalidade(event.target.value)}
									disabled={isPending}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="pessoa-motivo-matricula">Motivo (opcional)</Label>
								<Input
									id="pessoa-motivo-matricula"
									placeholder="Ex.: bolsa, permuta, desconto combinado"
									value={motivoMatricula}
									onChange={(event) => setMotivoMatricula(event.target.value)}
									disabled={isPending}
								/>
							</div>
						</>
					) : null}

					<div className="space-y-1.5">
						<Label>{rotuloInteresses(ehAluno, ehProfessor)}</Label>
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
