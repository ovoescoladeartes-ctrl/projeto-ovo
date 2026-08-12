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
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InteresseTagsInput } from "@/components/InteresseTagsInput";
import type { Matricula } from "@/core/matriculas/schema";
import type { Pessoa } from "@/core/pessoas/schema";
import { formatCentavos, parseCentavosInput } from "@/lib/currency";

import { atualizarMatricula } from "./actions";
import { MatricularDialog } from "./MatricularDialog";
import { MatriculaEncerrarButton } from "./MatriculaEncerrarButton";
import { MatriculaRestaurarButton } from "./MatriculaRestaurarButton";
import { atualizarPessoa, inativarPessoa } from "../actions";
import { PessoaExcluirButton } from "../PessoaExcluirButton";
import { StatusBadge } from "../StatusBadge";

const MATRICULA_STATUS_LABELS: Record<string, string> = {
	ativa: "Ativa",
	encerrada: "Encerrada",
};

function centavosParaInput(centavos: number): string {
	return (centavos / 100).toFixed(2).replace(".", ",");
}

function formatarData(iso: string | null): string {
	if (iso === null) {
		return "—";
	}
	return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

interface MatriculaComTurma {
	matricula: Matricula;
	turmaNome: string;
}

interface TurmaOpcao {
	id: string;
	nome: string;
	mensalidadeCentavos: number;
}

interface TurmaLecionada {
	id: string;
	nome: string;
	ativo: boolean;
}

interface MatriculaEdicao {
	mensalidade: string;
	motivo: string;
}

interface PessoaDetalheEditorProps {
	pessoa: Pessoa;
	opcoesInteresse: string[];
	matriculas: MatriculaComTurma[];
	turmasAtivas: TurmaOpcao[];
	turmasLecionadas: TurmaLecionada[];
	papelParaAdicionarInicial: "aluno" | "professor" | null;
	isAdmin: boolean;
}

function rotuloInteresses(ehAluno: boolean, ehProfessor: boolean): string {
	if (ehAluno && ehProfessor) {
		return "Interesses / Especialidade";
	}
	return ehProfessor ? "Especialidade" : "Interesses";
}

export function PessoaDetalheEditor({
	pessoa,
	opcoesInteresse,
	matriculas,
	turmasAtivas,
	turmasLecionadas,
	papelParaAdicionarInicial,
	isAdmin,
}: PessoaDetalheEditorProps): React.ReactElement {
	const [modoEdicao, setModoEdicao] = useState(papelParaAdicionarInicial !== null);
	const [nome, setNome] = useState(pessoa.nome);
	const [ehAluno, setEhAluno] = useState(pessoa.ehAluno || papelParaAdicionarInicial === "aluno");
	const [ehProfessor, setEhProfessor] = useState(pessoa.ehProfessor || papelParaAdicionarInicial === "professor");
	const [interesses, setInteresses] = useState<string[]>(pessoa.interesses);
	const [email, setEmail] = useState(pessoa.email ?? "");
	const [telefone, setTelefone] = useState(pessoa.telefone ?? "");
	const [matriculaEdits, setMatriculaEdits] = useState<Record<string, MatriculaEdicao>>({});
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const [arquivarOpen, setArquivarOpen] = useState(false);
	const [arquivarErro, setArquivarErro] = useState<string | null>(null);
	const [isArquivando, startArquivarTransition] = useTransition();

	function edicaoDaMatricula(matricula: Matricula): MatriculaEdicao {
		return (
			matriculaEdits[matricula.id] ?? {
				mensalidade: centavosParaInput(matricula.mensalidadeCombinadaCentavos),
				motivo: matricula.motivo ?? "",
			}
		);
	}

	function handleCancelar(): void {
		setNome(pessoa.nome);
		setEhAluno(pessoa.ehAluno);
		setEhProfessor(pessoa.ehProfessor);
		setInteresses(pessoa.interesses);
		setEmail(pessoa.email ?? "");
		setTelefone(pessoa.telefone ?? "");
		setMatriculaEdits({});
		setErro(null);
		setModoEdicao(false);
	}

	function handleSalvar(): void {
		setErro(null);

		const matriculasParaAtualizar: {
			id: string;
			pessoaId: string;
			mensalidadeCombinadaCentavos: number;
			motivo: string | null;
		}[] = [];

		for (const { matricula, turmaNome } of matriculas) {
			const edit = matriculaEdits[matricula.id];
			if (edit === undefined) {
				continue;
			}
			const original = edicaoDaMatricula(matricula);
			if (edit.mensalidade === original.mensalidade && edit.motivo === original.motivo) {
				continue;
			}
			const mensalidadeCombinadaCentavos = parseCentavosInput(edit.mensalidade);
			if (mensalidadeCombinadaCentavos === null) {
				setErro(`Mensalidade inválida na matrícula de ${turmaNome}.`);
				return;
			}
			matriculasParaAtualizar.push({
				id: matricula.id,
				pessoaId: pessoa.id,
				mensalidadeCombinadaCentavos,
				motivo: edit.motivo.trim() === "" ? null : edit.motivo.trim(),
			});
		}

		startTransition(async () => {
			const resultados = await Promise.all([
				atualizarPessoa({
					id: pessoa.id,
					nome,
					interesses,
					ehAluno,
					ehProfessor,
					email: email.trim() === "" ? null : email.trim(),
					telefone: telefone.trim() === "" ? null : telefone.trim(),
				}),
				...matriculasParaAtualizar.map((dados) => atualizarMatricula(dados)),
			]);
			const erroEncontrado = resultados.find((resultado) => resultado.status === "error");
			if (erroEncontrado) {
				setErro(erroEncontrado.message ?? "Não foi possível salvar.");
				return;
			}
			setMatriculaEdits({});
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

	return (
		<div>
			{modoEdicao ? (
				<div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted px-4 py-3">
					<p className="text-sm text-muted-foreground">
						Editando {pessoa.nome} — as mudanças valem pra página inteira.
					</p>
					<div className="flex gap-2">
						<Button type="button" variant="outline" size="sm" onClick={handleCancelar} disabled={isPending}>
							Cancelar
						</Button>
						<Button type="button" size="sm" onClick={handleSalvar} disabled={isPending || nome.trim() === "" || (!ehAluno && !ehProfessor)}>
							{isPending ? "Salvando..." : "Salvar"}
						</Button>
					</div>
				</div>
			) : null}

			<div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
				<div className="flex-1 space-y-4">
					{modoEdicao ? (
						<div className="space-y-1.5">
							<Label htmlFor={`pessoa-nome-${pessoa.id}`}>Nome</Label>
							<Input
								id={`pessoa-nome-${pessoa.id}`}
								value={nome}
								onChange={(event) => setNome(event.target.value)}
								disabled={isPending}
								className="max-w-md"
							/>
						</div>
					) : (
						<div>
							<h1 className="text-2xl font-bold text-foreground sm:text-3xl">{pessoa.nome}</h1>
							{pessoa.ativo ? null : <p className="text-sm text-muted-foreground">Arquivado</p>}
						</div>
					)}

					{modoEdicao ? (
						<div className="space-y-1.5">
							<Label>Papel</Label>
							<div className="flex flex-wrap gap-2">
								<Chip pressed={ehAluno} onClick={() => setEhAluno(!ehAluno)} disabled={isPending}>
									Aluno
								</Chip>
								<Chip pressed={ehProfessor} onClick={() => setEhProfessor(!ehProfessor)} disabled={isPending}>
									Professor
								</Chip>
							</div>
						</div>
					) : null}

					{modoEdicao ? (
						<div className="grid grid-cols-2 gap-3">
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
						</div>
					) : pessoa.email !== null || pessoa.telefone !== null ? (
						<p className="text-sm text-muted-foreground">
							{[pessoa.email, pessoa.telefone].filter((valor) => valor !== null).join(" · ")}
						</p>
					) : null}

					{modoEdicao ? (
						<div className="space-y-1.5">
							<Label>{rotuloInteresses(ehAluno, ehProfessor)}</Label>
							<InteresseTagsInput value={interesses} onChange={setInteresses} opcoes={opcoesInteresse} disabled={isPending} />
						</div>
					) : pessoa.interesses.length > 0 ? (
						<div className="flex flex-wrap gap-1.5">
							{pessoa.interesses.map((interesse) => (
								<Badge key={interesse} variant="outline">
									{interesse}
								</Badge>
							))}
						</div>
					) : null}

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}

					{modoEdicao && (pessoa.ativo || (!pessoa.ativo && isAdmin)) ? (
						<div className="rounded-md border border-danger/30 bg-danger/5 p-4">
							<h3 className="text-sm font-semibold text-danger">Zona de risco</h3>
							<div className="mt-3 flex flex-wrap items-center gap-2">
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
								) : null}
								{!pessoa.ativo && isAdmin ? <PessoaExcluirButton id={pessoa.id} nome={pessoa.nome} /> : null}
							</div>
						</div>
					) : null}
				</div>

				{!modoEdicao ? (
					<Button type="button" variant="outline" size="sm" onClick={() => setModoEdicao(true)}>
						Editar
					</Button>
				) : null}
			</div>

			{ehAluno ? (
				<div className="mt-10">
					<h2 className="text-lg font-semibold text-foreground">Aluno</h2>
					<div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
						{pessoa.statusAluno !== null ? <StatusBadge status={pessoa.statusAluno} /> : "—"}
						{pessoa.numeroMatriculaAluno !== null ? <span>Nº {pessoa.numeroMatriculaAluno}</span> : null}
					</div>

					<div className="mt-4 mb-3 flex items-center justify-between">
						<h3 className="text-sm font-semibold text-foreground">Matrículas</h3>
						<MatricularDialog pessoaId={pessoa.id} turmas={turmasAtivas} />
					</div>

					<div className="overflow-x-auto rounded-lg border border-border bg-card">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
								<tr>
									<th className="px-4 py-3 font-medium">Turma</th>
									<th className="px-4 py-3 font-medium">Status</th>
									<th className="px-4 py-3 font-medium">Mensalidade combinada</th>
									<th className="px-4 py-3 font-medium">Motivo</th>
									<th className="px-4 py-3 font-medium">Data de matrícula</th>
									<th className="px-4 py-3 font-medium">Data de encerramento</th>
									<th className="px-4 py-3 font-medium" />
								</tr>
							</thead>
							<tbody>
								{matriculas.map(({ matricula, turmaNome }) => {
									const edit = edicaoDaMatricula(matricula);
									return (
										<tr key={matricula.id} className="border-b border-border last:border-0">
											<td className="px-4 py-3 text-foreground">{turmaNome}</td>
											<td className="px-4 py-3">
												<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
													{MATRICULA_STATUS_LABELS[matricula.status] ?? matricula.status}
												</span>
											</td>
											<td className="px-4 py-3 text-muted-foreground">
												{modoEdicao ? (
													<Input
														inputMode="decimal"
														value={edit.mensalidade}
														onChange={(event) =>
															setMatriculaEdits((prev) => ({
																...prev,
																[matricula.id]: { ...edit, mensalidade: event.target.value },
															}))
														}
														disabled={isPending}
														className="w-28"
													/>
												) : (
													formatCentavos(matricula.mensalidadeCombinadaCentavos)
												)}
											</td>
											<td className="px-4 py-3 text-muted-foreground">
												{modoEdicao ? (
													<Input
														placeholder="Ex.: bolsa, permuta, desconto combinado"
														value={edit.motivo}
														onChange={(event) =>
															setMatriculaEdits((prev) => ({
																...prev,
																[matricula.id]: { ...edit, motivo: event.target.value },
															}))
														}
														disabled={isPending}
													/>
												) : (
													matricula.motivo ?? "—"
												)}
											</td>
											<td className="px-4 py-3 text-muted-foreground">{formatarData(matricula.dataMatricula)}</td>
											<td className="px-4 py-3 text-muted-foreground">{formatarData(matricula.dataEncerramento)}</td>
											<td className="px-4 py-3 text-right">
												{matricula.status === "ativa" ? (
													<MatriculaEncerrarButton id={matricula.id} pessoaId={pessoa.id} />
												) : (
													<MatriculaRestaurarButton id={matricula.id} pessoaId={pessoa.id} />
												)}
											</td>
										</tr>
									);
								})}
								{matriculas.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
											Nenhuma matrícula ainda.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
				</div>
			) : null}

			{ehAluno && ehProfessor ? <hr className="my-10 border-border" /> : null}

			{ehProfessor ? (
				<div className="mt-10">
					<h2 className="text-lg font-semibold text-foreground">Professor</h2>
					<div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
						{pessoa.statusProfessor !== null ? <StatusBadge status={pessoa.statusProfessor} /> : "—"}
						{pessoa.numeroMatriculaProfessor !== null ? <span>Nº {pessoa.numeroMatriculaProfessor}</span> : null}
					</div>

					<h3 className="mt-4 mb-3 text-sm font-semibold text-foreground">Turmas lecionadas</h3>
					<p className="mb-3 text-xs text-muted-foreground">
						Somente leitura aqui — quem decide o educador de uma turma é a edição da própria Turma.
					</p>
					<div className="overflow-x-auto rounded-lg border border-border bg-card">
						<table className="w-full text-left text-sm">
							<tbody>
								{turmasLecionadas.map((turma) => (
									<tr key={turma.id} className="border-b border-border last:border-0">
										<td className="px-4 py-3 text-foreground">
											{turma.nome}
											{turma.ativo ? null : (
												<Badge variant="outline" className="ml-2 text-muted-foreground">
													Arquivada
												</Badge>
											)}
										</td>
									</tr>
								))}
								{turmasLecionadas.length === 0 ? (
									<tr>
										<td className="px-4 py-6 text-center text-muted-foreground">Nenhuma turma ainda.</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
				</div>
			) : null}
		</div>
	);
}
