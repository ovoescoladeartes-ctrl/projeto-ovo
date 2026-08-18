"use client";

import { DonutRanking } from "@/components/dashboard/charts/DonutRanking";
import { RankingHorizontal } from "@/components/dashboard/charts/RankingHorizontal";
import { SerieMensalBarras } from "@/components/dashboard/charts/SerieMensalBarras";
import { SerieMensalLinha } from "@/components/dashboard/charts/SerieMensalLinha";
import { Card } from "@/components/ui/card";
import type { VisaoGeralData } from "@/core/dashboard/visaoGeral";
import { formatarDuracao } from "@/lib/duracao";

function formatarAlunos(quantidade: number): string {
	return `${quantidade} aluno${quantidade === 1 ? "" : "s"}`;
}

function formatarMatriculas(quantidade: number): string {
	return `${quantidade} matrícula${quantidade === 1 ? "" : "s"}`;
}

interface VisaoGeralContentProps {
	dados: VisaoGeralData;
}

export function VisaoGeralContent({ dados }: VisaoGeralContentProps): React.ReactElement {
	const avisoDadoAproximado = dados.temMatriculasComDataAproximada ? (
		<p className="mt-3 text-xs text-muted-foreground">
			* Matrículas importadas via CSV com data aproximada não entram nesta série.
		</p>
	) : null;

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<Card className="min-w-0 p-5">
					<p className="break-words text-xs font-medium text-muted-foreground">Alunos ativos</p>
					<p className="mt-2 break-words text-3xl font-bold text-foreground">{dados.highlights.alunosAtivos}</p>
					<p className="mt-1 break-words text-sm text-muted-foreground">Matriculados</p>
				</Card>
				<Card className="min-w-0 p-5">
					<p className="break-words text-xs font-medium text-muted-foreground">Turmas ativas</p>
					<p className="mt-2 break-words text-3xl font-bold text-foreground">{dados.highlights.turmasAtivas}</p>
					<p className="mt-1 break-words text-sm text-muted-foreground">Cursos e oficinas</p>
				</Card>
				<Card className="min-w-0 p-5">
					<p className="break-words text-xs font-medium text-muted-foreground">Novos alunos</p>
					<p className="mt-2 break-words text-3xl font-bold text-foreground">{dados.highlights.novosAlunosNoMes}</p>
					<p className="mt-1 break-words text-sm text-muted-foreground">Matriculados este mês</p>
				</Card>
				<Card className="min-w-0 p-5">
					<p className="break-words text-xs font-medium text-muted-foreground">Professores ativos</p>
					<p className="mt-2 break-words text-3xl font-bold text-foreground">{dados.highlights.professoresAtivos}</p>
					<p className="mt-1 break-words text-sm text-muted-foreground">Dando aula hoje</p>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card className="min-w-0 p-5">
					<p className="text-sm font-medium text-foreground">Turmas com mais alunos</p>
					<p className="mt-1 text-xs text-muted-foreground">Matrículas ativas, top {dados.turmasPorAlunos.length}.</p>
					<div className="mt-4">
						<DonutRanking
							itens={dados.turmasPorAlunos.map((turma) => ({
								chave: turma.turmaId ?? turma.nome,
								label: turma.nome,
								valor: turma.alunos,
							}))}
							formatarValor={formatarAlunos}
							vazio="Nenhuma matrícula ativa ainda."
						/>
					</div>
				</Card>

				<Card className="min-w-0 p-5">
					<p className="text-sm font-medium text-foreground">Top 10 alunos por tempo de escola</p>
					<p className="mt-1 text-xs text-muted-foreground">Soma do tempo em todas as matrículas, até hoje se ainda ativa.</p>
					<div className="mt-4">
						<RankingHorizontal
							itens={dados.alunosPorTempo.map((aluno) => ({
								chave: aluno.pessoaId,
								label: aluno.nome,
								valor: aluno.dias,
								cor: "var(--chart-1)",
							}))}
							formatarValor={(dias) => formatarDuracao(dias)}
							vazio="Nenhuma matrícula com data registrada ainda."
						/>
					</div>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card className="min-w-0 p-5">
					<p className="text-sm font-medium text-foreground">Sazonalidade de matrículas</p>
					<p className="mt-1 text-xs text-muted-foreground">Novas matrículas por mês, últimos 12 meses.</p>
					<div className="mt-4">
						<SerieMensalBarras
							dados={dados.sazonalidadeMatriculas.map((ponto) => ({ label: ponto.label, valor: ponto.total }))}
							formatarValor={formatarMatriculas}
							nomeSerie="Matrículas"
						/>
					</div>
					{avisoDadoAproximado}
				</Card>

				<Card className="min-w-0 p-5">
					<p className="text-sm font-medium text-foreground">Alunos ativos por período</p>
					<p className="mt-1 text-xs text-muted-foreground">Matrículas ativas no fim de cada mês, últimos 12 meses.</p>
					<div className="mt-4">
						<SerieMensalLinha
							dados={dados.alunosAtivosPorPeriodo.map((ponto) => ({ label: ponto.label, valor: ponto.total }))}
							formatarValor={formatarAlunos}
							nomeSerie="Alunos ativos"
						/>
					</div>
					{avisoDadoAproximado}
				</Card>
			</div>
		</div>
	);
}
