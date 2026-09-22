import { contarAlunosMatriculados, contarProfessoresAtivos } from "@/core/pessoas/contadores";
import type { Pessoa } from "@/core/pessoas/schema";
import type { Matricula } from "@/core/matriculas/schema";
import type { Turma } from "@/core/turmas/schema";
import { gerarJanelaMeses } from "@/core/shared/mesesJanela";

export interface RankingAlunos {
	turmaId: string | null;
	nome: string;
	alunos: number;
}

export interface RankingAlunoTempo {
	pessoaId: string;
	nome: string;
	dias: number;
}

export interface PontoSerieMensalContagem {
	anoMes: string;
	label: string;
	total: number;
}

/**
 * Highlights do topo da aba Geral — só saúde operacional da escola (alunos, turmas,
 * professores). Nunca dado financeiro (já é a aba Financeiro) nem de comunicação/funil (já é a
 * aba Comunicação) — decisão do Rogério em 2026-08-17, ver docs/design.md regra de escopo do
 * Geral (a acrescentar).
 */
export interface HighlightsGerais {
	alunosAtivos: number;
	turmasAtivas: number;
	novosAlunosNoMes: number;
	professoresAtivos: number;
}

export interface VisaoGeralData {
	highlights: HighlightsGerais;
	turmasPorAlunos: RankingAlunos[];
	alunosPorTempo: RankingAlunoTempo[];
	sazonalidadeMatriculas: PontoSerieMensalContagem[];
	alunosAtivosPorPeriodo: PontoSerieMensalContagem[];
	/** Sinaliza a ressalva de qualidade de dado (matrículas com `dataMatricula` aproximada, importadas via CSV) — usado pra mostrar o aviso nos gráficos de série temporal, ver docs/proposta-dashboard-financeiro.md. */
	temMatriculasComDataAproximada: boolean;
}

const JANELA_MESES = 12;
const TOP_N_TURMAS = 5;
const TOP_N_ALUNOS = 10;

function anoMesDe(iso: string): string {
	return iso.slice(0, 7);
}

export interface DadosVisaoGeral {
	turmas: Turma[];
	matriculas: Matricula[];
	// `contarAlunosMatriculados`/`contarProfessoresAtivos` (core/pessoas/contadores.ts) tipam o
	// parâmetro como array mutável — mantido igual aqui pra aceitar o retorno de `lerPessoas()`
	// sem exigir cópia.
	pessoas: Pessoa[];
}

/** Pura — recebe os arrays já lidos por `src/core/db/` (`lerTurmas`, `lerMatriculas`, `lerPessoas`), não acessa o Firestore. */
export function montarVisaoGeral(dados: DadosVisaoGeral, agora: Date): VisaoGeralData {
	const turmasNomes: Record<string, string> = {};
	let turmasAtivas = 0;
	dados.turmas.forEach((turma) => {
		turmasNomes[turma.id] = turma.nome;
		if (turma.ativo) {
			turmasAtivas += 1;
		}
	});

	const pessoasNomes: Record<string, string> = {};
	dados.pessoas.forEach((pessoa) => {
		pessoasNomes[pessoa.id] = pessoa.nome;
	});

	interface MatriculaResumo {
		pessoaId: string;
		turmaId: string;
		status: string;
		dataMatricula: string | null;
		dataEncerramento: string | null;
		dataConfiavel: boolean;
	}

	const matriculas: MatriculaResumo[] = dados.matriculas.map((matricula) => ({
		pessoaId: matricula.pessoaId,
		turmaId: matricula.turmaId,
		status: matricula.status,
		dataMatricula: matricula.dataMatricula,
		dataEncerramento: matricula.dataEncerramento,
		dataConfiavel: matricula.observacoes === undefined || matricula.observacoes === null,
	}));

	// Highlights do topo da aba.
	const anoMesAtual = anoMesDe(agora.toISOString());
	const novosAlunosNoMes = matriculas.filter(
		(matricula) =>
			matricula.dataConfiavel && matricula.dataMatricula !== null && anoMesDe(matricula.dataMatricula) === anoMesAtual,
	).length;
	const highlights: HighlightsGerais = {
		alunosAtivos: contarAlunosMatriculados(dados.pessoas),
		turmasAtivas,
		novosAlunosNoMes,
		professoresAtivos: contarProfessoresAtivos(dados.pessoas),
	};

	// Turmas com mais alunos — só matrícula ativa, mesmo padrão de vagasOcupadas em pessoas/turmas/page.tsx.
	const alunosPorTurma = new Map<string, number>();
	matriculas
		.filter((matricula) => matricula.status === "ativa")
		.forEach((matricula) => {
			alunosPorTurma.set(matricula.turmaId, (alunosPorTurma.get(matricula.turmaId) ?? 0) + 1);
		});
	const rankingAlunos: RankingAlunos[] = Array.from(alunosPorTurma.entries())
		.map(([turmaId, alunos]) => ({ turmaId, nome: turmasNomes[turmaId] ?? "Turma removida", alunos }))
		.sort((a, b) => b.alunos - a.alunos);
	const turmasPorAlunos =
		rankingAlunos.length <= TOP_N_TURMAS
			? rankingAlunos
			: [
					...rankingAlunos.slice(0, TOP_N_TURMAS),
					{
						turmaId: null,
						nome: "Outras turmas",
						alunos: rankingAlunos.slice(TOP_N_TURMAS).reduce((soma, linha) => soma + linha.alunos, 0),
					},
				];

	// Top 10 alunos por tempo total na escola — soma a duração de todas as matrículas da pessoa
	// (matrícula ativa conta até "agora"). Não exclui matrícula com data aproximada (import CSV):
	// excluir jogaria fora justamente os alunos mais antigos, que é quem esse ranking quer destacar.
	const diasPorPessoa = new Map<string, number>();
	matriculas.forEach((matricula) => {
		if (matricula.dataMatricula === null) {
			return;
		}
		const inicio = new Date(matricula.dataMatricula).getTime();
		const fim = matricula.dataEncerramento !== null ? new Date(matricula.dataEncerramento).getTime() : agora.getTime();
		const dias = Math.max(0, Math.round((fim - inicio) / (1000 * 60 * 60 * 24)));
		diasPorPessoa.set(matricula.pessoaId, (diasPorPessoa.get(matricula.pessoaId) ?? 0) + dias);
	});
	const alunosPorTempo: RankingAlunoTempo[] = Array.from(diasPorPessoa.entries())
		.map(([pessoaId, dias]) => ({ pessoaId, nome: pessoasNomes[pessoaId] ?? "Pessoa removida", dias }))
		.sort((a, b) => b.dias - a.dias)
		.slice(0, TOP_N_ALUNOS);

	// Séries temporais — excluem matrícula com data aproximada (import CSV) pra não gerar pico
	// artificial no mês do import, ver ressalva do discovery.
	const matriculasComDataConfiavel = matriculas.filter((matricula) => matricula.dataConfiavel);
	const temMatriculasComDataAproximada = matriculasComDataConfiavel.length < matriculas.length;

	const janela = gerarJanelaMeses(JANELA_MESES, agora);

	const novasPorMes = new Map(janela.map((ponto) => [ponto.anoMes, 0]));
	matriculasComDataConfiavel
		.filter((matricula) => matricula.dataMatricula !== null)
		.forEach((matricula) => {
			const anoMes = matricula.dataMatricula!.slice(0, 7);
			if (novasPorMes.has(anoMes)) {
				novasPorMes.set(anoMes, (novasPorMes.get(anoMes) ?? 0) + 1);
			}
		});
	const sazonalidadeMatriculas: PontoSerieMensalContagem[] = janela.map((ponto) => ({
		...ponto,
		total: novasPorMes.get(ponto.anoMes) ?? 0,
	}));

	// Alunos ativos por período — snapshot no fim de cada mês: matriculada até lá e ainda sem
	// encerramento até lá (ou encerrada depois).
	const alunosAtivosPorPeriodo: PontoSerieMensalContagem[] = janela.map((ponto) => {
		const fimDoMes = `${ponto.anoMes}-31`;
		const total = matriculasComDataConfiavel.filter((matricula) => {
			if (matricula.dataMatricula === null || matricula.dataMatricula.slice(0, 10) > fimDoMes) {
				return false;
			}
			return matricula.dataEncerramento === null || matricula.dataEncerramento.slice(0, 10) > fimDoMes;
		}).length;
		return { ...ponto, total };
	});

	return {
		highlights,
		turmasPorAlunos,
		alunosPorTempo,
		sazonalidadeMatriculas,
		alunosAtivosPorPeriodo,
		temMatriculasComDataAproximada,
	};
}
