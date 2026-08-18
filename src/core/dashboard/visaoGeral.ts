import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { contarAlunosMatriculados, contarProfessoresAtivos } from "@/core/pessoas/contadores";
import type { Pessoa } from "@/core/pessoas/schema";
import { gerarJanelaMeses } from "@/core/shared/mesesJanela";
import { toIso } from "@/core/shared/serialize";

interface TurmaDoc {
	nome: string;
	ativo: boolean;
}

interface MatriculaDoc {
	pessoaId: string;
	turmaId: string;
	status: string;
	dataMatricula?: Timestamp;
	dataEncerramento?: Timestamp | null;
	/** Só preenchido pelo import CSV — sinaliza que `dataMatricula` é aproximada (data do import, não a real). */
	observacoes?: string | null;
}

interface PessoaDoc {
	nome: string;
	ehAluno: boolean;
	statusAluno: string | null;
	ehProfessor: boolean;
	statusProfessor: string | null;
	ativo: boolean;
}

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

export async function montarVisaoGeral(firestore: FirebaseFirestore.Firestore, agora: Date): Promise<VisaoGeralData> {
	const [turmasSnapshot, matriculasSnapshot, pessoasSnapshot] = await Promise.all([
		firestore.collection("turmas").get(),
		firestore.collection("matriculas").get(),
		firestore.collection("pessoas").get(),
	]);

	const turmasNomes: Record<string, string> = {};
	let turmasAtivas = 0;
	turmasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as TurmaDoc;
		turmasNomes[doc.id] = data.nome;
		if (data.ativo) {
			turmasAtivas += 1;
		}
	});

	const pessoasNomes: Record<string, string> = {};
	const pessoas: Pick<Pessoa, "ehAluno" | "statusAluno" | "ehProfessor" | "statusProfessor" | "ativo">[] = [];
	pessoasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as PessoaDoc;
		pessoasNomes[doc.id] = data.nome;
		pessoas.push({
			ehAluno: data.ehAluno,
			statusAluno: data.statusAluno as Pessoa["statusAluno"],
			ehProfessor: data.ehProfessor,
			statusProfessor: data.statusProfessor as Pessoa["statusProfessor"],
			ativo: data.ativo,
		});
	});

	interface MatriculaResumo {
		pessoaId: string;
		turmaId: string;
		status: string;
		dataMatricula: string | null;
		dataEncerramento: string | null;
		dataConfiavel: boolean;
	}

	const matriculas: MatriculaResumo[] = matriculasSnapshot.docs.map((doc) => {
		const data = doc.data() as MatriculaDoc;
		return {
			pessoaId: data.pessoaId,
			turmaId: data.turmaId,
			status: data.status,
			dataMatricula: toIso(data.dataMatricula ?? null),
			dataEncerramento: toIso(data.dataEncerramento ?? null),
			dataConfiavel: data.observacoes === undefined || data.observacoes === null,
		};
	});

	// Highlights do topo da aba.
	const anoMesAtual = anoMesDe(agora.toISOString());
	const novosAlunosNoMes = matriculas.filter(
		(matricula) =>
			matricula.dataConfiavel && matricula.dataMatricula !== null && anoMesDe(matricula.dataMatricula) === anoMesAtual,
	).length;
	const highlights: HighlightsGerais = {
		alunosAtivos: contarAlunosMatriculados(pessoas),
		turmasAtivas,
		novosAlunosNoMes,
		professoresAtivos: contarProfessoresAtivos(pessoas),
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
