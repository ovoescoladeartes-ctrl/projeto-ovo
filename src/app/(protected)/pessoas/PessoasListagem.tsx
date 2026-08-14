"use client";

import { ChevronDown, Eye, MoreVertical } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AbaAtivosArquivados } from "@/components/AbaAtivosArquivados";
import { CopilotoInput } from "@/components/dashboard/CopilotoInput";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { ExportarDropdown } from "./ExportarDropdown";
import { NovaPessoaDialog } from "./NovaPessoaDialog";
import { PessoaArquivarMenuItem } from "./PessoaArquivarMenuItem";
import { PessoaDesarquivarMenuItem } from "./PessoaDesarquivarMenuItem";
import { PessoasFiltroBar } from "./PessoasFiltroBar";
import { PessoasPaginacao } from "./PessoasPaginacao";
import { StatusBadge } from "./StatusBadge";

const MAX_TURMAS_VISIVEIS = 2;

export interface PessoaListagemRow {
	id: string;
	nome: string;
	ehAluno: boolean;
	ehProfessor: boolean;
	statusAluno: string | null;
	statusProfessor: string | null;
	ativo: boolean;
	criadoEm: string | null;
	turmas: string[];
}

interface TurmaOpcao {
	id: string;
	nome: string;
	mensalidadeCentavos: number;
}

interface PessoasListagemProps {
	pessoas: PessoaListagemRow[];
	totalItens: number;
	paginaAtual: number;
	totalPaginas: number;
	itensPorPagina: number;
	opcoesInteresse: string[];
	opcoesTurma: string[];
	turmasAtivas: TurmaOpcao[];
}

function formatarData(iso: string | null): string {
	if (iso === null) {
		return "—";
	}
	return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/**
 * Header (título | Copiloto | Nova pessoa), abas Ativos/Arquivados e filtros (busca + papel +
 * avançados) ficam fora do card, seguindo a ordem da regra 15 do design.md — o card só tem
 * tabela + paginação. Seleção em massa (checkbox por linha) alimenta o botão "Exportar" do
 * cabeçalho da tabela (ExportarDropdown).
 */
export function PessoasListagem({
	pessoas,
	totalItens,
	paginaAtual,
	totalPaginas,
	itensPorPagina,
	opcoesInteresse,
	opcoesTurma,
	turmasAtivas,
}: PessoasListagemProps): React.ReactElement {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

	const todosMarcados = pessoas.length > 0 && pessoas.every((pessoa) => selecionados.has(pessoa.id));

	function alternarTodos(marcado: boolean): void {
		setSelecionados((atual) => {
			const proximo = new Set(atual);
			pessoas.forEach((pessoa) => {
				if (marcado) {
					proximo.add(pessoa.id);
				} else {
					proximo.delete(pessoa.id);
				}
			});
			return proximo;
		});
	}

	function alternarUm(id: string, marcado: boolean): void {
		setSelecionados((atual) => {
			const proximo = new Set(atual);
			if (marcado) {
				proximo.add(id);
			} else {
				proximo.delete(id);
			}
			return proximo;
		});
	}

	function hrefOrdenar(campo: "nome" | "criadoEm"): string {
		const atual = searchParams.get("ordenar") ?? "nome_asc";
		const [campoAtual, direcaoAtual] = atual.split("_");
		const novaDirecao = campoAtual === campo && direcaoAtual === "asc" ? "desc" : "asc";
		const params = new URLSearchParams(searchParams.toString());
		params.set("ordenar", `${campo}_${novaDirecao}`);
		params.delete("pagina");
		const query = params.toString();
		return query.length > 0 ? `${pathname}?${query}` : pathname;
	}

	function iconeOrdenar(campo: "nome" | "criadoEm"): React.ReactElement {
		const atual = searchParams.get("ordenar") ?? "nome_asc";
		const [campoAtual, direcaoAtual] = atual.split("_");
		const ativo = campoAtual === campo;
		return (
			<ChevronDown
				className={cn(
					"h-3.5 w-3.5 transition-transform",
					ativo ? "text-foreground" : "text-muted-foreground/50",
					ativo && direcaoAtual === "asc" ? "rotate-180" : "",
				)}
			/>
		);
	}

	return (
		<div>
			<PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Cadastro" }, { label: "Pessoas" }]} />
			<div className="mb-6 mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Pessoas</h1>
					{selecionados.size > 0 ? (
						<p className="text-sm text-muted-foreground">
							<span className="font-bold text-foreground">{selecionados.size} selecionadas</span>{" "}
							<button
								type="button"
								onClick={() => setSelecionados(new Set())}
								className="text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
							>
								Cancelar seleção
							</button>
						</p>
					) : null}
				</div>
				<CopilotoInput />
				<NovaPessoaDialog opcoesInteresse={opcoesInteresse} turmasAtivas={turmasAtivas} />
			</div>

			<div className="mb-6">
				<AbaAtivosArquivados />
			</div>

			<div className="mb-6">
				<PessoasFiltroBar opcoesInteresse={opcoesInteresse} opcoesTurma={opcoesTurma} />
			</div>

			<Card>
				<CardContent className="p-4">
					<div className="overflow-x-auto rounded-lg border border-border">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
								<tr>
									<th className="w-10 px-4 py-3">
										<Checkbox
											checked={todosMarcados}
											onCheckedChange={(checked) => alternarTodos(checked === true)}
											aria-label="Selecionar todos"
										/>
									</th>
									<th className="px-4 py-3 font-medium">
										<Link href={hrefOrdenar("nome")} className="inline-flex items-center gap-1 hover:text-foreground">
											Nome
											{iconeOrdenar("nome")}
										</Link>
									</th>
									<th className="px-4 py-3 font-medium">Tipo</th>
									<th className="px-4 py-3 font-medium">Status</th>
									<th className="px-4 py-3 font-medium">Turma(s)</th>
									<th className="px-4 py-3 font-medium">
										<Link
											href={hrefOrdenar("criadoEm")}
											className="inline-flex items-center gap-1 hover:text-foreground"
										>
											Cadastrado em
											{iconeOrdenar("criadoEm")}
										</Link>
									</th>
									<th className="px-4 py-3">
										<ExportarDropdown pessoaIds={Array.from(selecionados)} />
									</th>
								</tr>
							</thead>
							<tbody>
								{pessoas.map((pessoa) => {
									const turmasVisiveis = pessoa.turmas.slice(0, MAX_TURMAS_VISIVEIS).join(", ");
									const restante = pessoa.turmas.length - MAX_TURMAS_VISIVEIS;
									return (
										<tr key={pessoa.id} className="border-b border-border last:border-0">
											<td className="px-4 py-3">
												<Checkbox
													checked={selecionados.has(pessoa.id)}
													onCheckedChange={(checked) => alternarUm(pessoa.id, checked === true)}
													aria-label={`Selecionar ${pessoa.nome}`}
												/>
											</td>
											<td className="px-4 py-3">
												<Link href={`/pessoas/${pessoa.id}`} className="font-medium text-foreground hover:underline">
													{pessoa.nome}
												</Link>
											</td>
											<td className="px-4 py-3 text-muted-foreground">
												{[pessoa.ehAluno ? "Aluno" : null, pessoa.ehProfessor ? "Professor" : null].filter(Boolean).join(", ")}
											</td>
											<td className="px-4 py-3">
												<div className="flex flex-wrap gap-1">
													{pessoa.ehAluno && pessoa.statusAluno !== null ? (
														<StatusBadge status={pessoa.statusAluno} prefixo={pessoa.ehProfessor ? "Aluno: " : undefined} />
													) : null}
													{pessoa.ehProfessor && pessoa.statusProfessor !== null ? (
														<StatusBadge status={pessoa.statusProfessor} prefixo={pessoa.ehAluno ? "Professor: " : undefined} />
													) : null}
												</div>
											</td>
											<td className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground" title={pessoa.turmas.join(", ")}>
												{pessoa.turmas.length === 0 ? "—" : `${turmasVisiveis}${restante > 0 ? ` +${restante}` : ""}`}
											</td>
											<td className="px-4 py-3 text-muted-foreground">{formatarData(pessoa.criadoEm)}</td>
											<td className="px-4 py-3 text-right">
												<div className="flex justify-end gap-1">
													<Button type="button" variant="outline" size="sm" aria-label={`Ver ${pessoa.nome}`} asChild>
														<Link href={`/pessoas/${pessoa.id}`}>
															<Eye className="h-4 w-4" />
															Ver
														</Link>
													</Button>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button type="button" variant="ghost" size="icon" title="Mais ações" aria-label="Mais ações">
																<MoreVertical className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{pessoa.ativo ? (
																<PessoaArquivarMenuItem id={pessoa.id} nome={pessoa.nome} />
															) : (
																<PessoaDesarquivarMenuItem id={pessoa.id} nome={pessoa.nome} />
															)}
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</td>
										</tr>
									);
								})}
								{pessoas.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
											Nenhuma pessoa encontrada.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>

					<div className="mt-4">
						<PessoasPaginacao
							paginaAtual={paginaAtual}
							totalPaginas={totalPaginas}
							totalItens={totalItens}
							itensPorPagina={itensPorPagina}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
