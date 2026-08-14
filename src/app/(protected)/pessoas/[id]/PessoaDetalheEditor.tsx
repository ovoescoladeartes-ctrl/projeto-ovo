import { MoreVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import type { Matricula } from "@/core/matriculas/schema";
import type { Pessoa } from "@/core/pessoas/schema";
import { formatCentavos } from "@/lib/currency";

import { MatricularDialog } from "./MatricularDialog";
import { MatriculaEditDialog } from "./MatriculaEditDialog";
import { MatriculaEncerrarMenuItem } from "./MatriculaEncerrarMenuItem";
import { MatriculaRestaurarMenuItem } from "./MatriculaRestaurarMenuItem";
import { PessoaEditDialog } from "./PessoaEditDialog";
import { StatusBadge } from "../StatusBadge";

const MATRICULA_STATUS_LABELS: Record<string, string> = {
	ativa: "Ativa",
	encerrada: "Encerrada",
};

// Cores indicativas de status (regra 18 do design.md): verde=ativa, azul=encerrada (fechada sem
// ser uma falha/cancelamento — não é "vermelho").
const MATRICULA_STATUS_CORES: Record<string, string> = {
	ativa: "bg-emerald-100 text-emerald-800",
	encerrada: "bg-blue-100 text-blue-800",
};

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

interface PessoaDetalheEditorProps {
	pessoa: Pessoa;
	opcoesInteresse: string[];
	matriculas: MatriculaComTurma[];
	turmasAtivas: TurmaOpcao[];
	turmasLecionadas: TurmaLecionada[];
	papelParaAdicionarInicial: "aluno" | "professor" | null;
	isAdmin: boolean;
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
	return (
		<div>
			<PageBreadcrumb
				items={[
					{ label: "Dashboard", href: "/" },
					{ label: "Cadastro" },
					{ label: "Pessoas", href: "/pessoas" },
					{ label: pessoa.nome },
				]}
			/>

			<div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
				<div className="flex-1 space-y-4">
					<div>
						<h1 className="text-2xl font-bold text-foreground sm:text-3xl">{pessoa.nome}</h1>
						{pessoa.ativo ? null : <p className="text-sm text-muted-foreground">Arquivado</p>}
					</div>

					{pessoa.email !== null || pessoa.telefone !== null ? (
						<p className="text-sm text-muted-foreground">
							{[pessoa.email, pessoa.telefone].filter((valor) => valor !== null).join(" · ")}
						</p>
					) : null}

					{pessoa.interesses.length > 0 ? (
						<div className="flex flex-wrap gap-1.5">
							{pessoa.interesses.map((interesse) => (
								<Badge key={interesse} variant="outline">
									{interesse}
								</Badge>
							))}
						</div>
					) : null}
				</div>

				<PessoaEditDialog
					pessoa={pessoa}
					opcoesInteresse={opcoesInteresse}
					isAdmin={isAdmin}
					papelParaAdicionarInicial={papelParaAdicionarInicial}
				/>
			</div>

			{pessoa.ehAluno ? (
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
								{matriculas.map(({ matricula, turmaNome }) => (
									<tr key={matricula.id} className="border-b border-border last:border-0">
										<td className="px-4 py-3 text-foreground">{turmaNome}</td>
										<td className="px-4 py-3">
											<span
												className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${MATRICULA_STATUS_CORES[matricula.status] ?? "bg-secondary text-secondary-foreground"}`}
											>
												{MATRICULA_STATUS_LABELS[matricula.status] ?? matricula.status}
											</span>
										</td>
										<td className="px-4 py-3 text-muted-foreground">{formatCentavos(matricula.mensalidadeCombinadaCentavos)}</td>
										<td className="px-4 py-3 text-muted-foreground">{matricula.motivo ?? "—"}</td>
										<td className="px-4 py-3 text-muted-foreground">{formatarData(matricula.dataMatricula)}</td>
										<td className="px-4 py-3 text-muted-foreground">{formatarData(matricula.dataEncerramento)}</td>
										<td className="px-4 py-3 text-right">
											<div className="flex items-center justify-end gap-1">
												<MatriculaEditDialog matricula={matricula} turmaNome={turmaNome} />
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button type="button" variant="ghost" size="icon" title="Mais ações" aria-label="Mais ações">
															<MoreVertical className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														{matricula.status === "ativa" ? (
															<MatriculaEncerrarMenuItem id={matricula.id} pessoaId={pessoa.id} />
														) : (
															<MatriculaRestaurarMenuItem id={matricula.id} pessoaId={pessoa.id} />
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</td>
									</tr>
								))}
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

			{pessoa.ehAluno && pessoa.ehProfessor ? <hr className="my-10 border-border" /> : null}

			{pessoa.ehProfessor ? (
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
												<span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
													Arquivada
												</span>
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
