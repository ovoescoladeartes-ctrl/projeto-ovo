import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { lerMatriculas } from "@/core/db/matriculas";
import { lerPessoas } from "@/core/db/pessoas";
import { lerTurmas } from "@/core/db/turmas";
import { listarInteressesAtivos } from "@/core/interesses/actions";

import { PessoasListagem, type PessoaListagemRow } from "./PessoasListagem";

// Sem isso, trocar só o searchParam `arquivados`/`ordenar`/etc. na mesma rota pode servir uma
// resposta em cache do Router do Next em vez de buscar dados frescos no servidor — foi a causa
// raiz das abas Ativos/Arquivados parecendo travadas no mesmo conteúdo (round 3).
export const dynamic = "force-dynamic";

const PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];
const ITENS_POR_PAGINA = 25;

interface PessoasPageProps {
	searchParams: Promise<{
		aluno?: string;
		professor?: string;
		status?: string;
		interesse?: string;
		turma?: string;
		arquivados?: string;
		ordenar?: string;
		pagina?: string;
	}>;
}

type PessoaFiltravel = PessoaListagemRow & { interesses: string[] };

export default async function PessoasPage({ searchParams }: PessoasPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !PESSOAS_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;
	const mostrarArquivados = filtros.arquivados === "1";

	const [todasPessoas, todasTurmas, todasMatriculas, opcoesInteresse] = await Promise.all([
		lerPessoas(),
		lerTurmas(),
		lerMatriculas(),
		listarInteressesAtivos(),
	]);

	// Arquivados mostra só ativo===false, nunca "todo mundo" — bug real do round 3, não era cache.
	const pessoasFiltradas = todasPessoas.filter((pessoa) => pessoa.ativo === !mostrarArquivados);
	const turmasAtivasDocs = todasTurmas.filter((turma) => turma.ativo);
	const matriculasAtivas = todasMatriculas.filter((matricula) => matricula.status === "ativa");

	const turmasNomes = new Map<string, string>();
	const turmasAtivas: { id: string; nome: string; mensalidadeCentavos: number }[] = [];
	turmasAtivasDocs.forEach((turma) => {
		turmasNomes.set(turma.id, turma.nome);
		turmasAtivas.push({ id: turma.id, nome: turma.nome, mensalidadeCentavos: turma.mensalidadeCentavos });
	});
	// `turmasNomes` é por id — duas turmas com o mesmo nome (IDs diferentes) duplicariam a
	// opção no filtro (mesmo `key`/`value` no Select), daí o dedupe via `Set` antes de ordenar.
	const opcoesTurma = Array.from(new Set(turmasNomes.values())).sort((a, b) => a.localeCompare(b, "pt-BR"));
	turmasAtivas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	const turmasPorPessoa = new Map<string, string[]>();
	matriculasAtivas.forEach((matricula) => {
		const nome = turmasNomes.get(matricula.turmaId);
		if (nome === undefined) {
			return;
		}
		const lista = turmasPorPessoa.get(matricula.pessoaId) ?? [];
		lista.push(nome);
		turmasPorPessoa.set(matricula.pessoaId, lista);
	});

	let pessoas: PessoaFiltravel[] = pessoasFiltradas.map((pessoa) => ({
		id: pessoa.id,
		nome: pessoa.nome,
		// `?? false`/`?? null` defensivos — documento legado de antes do papel duplo não teria
		// esses campos gravados; sem isso a linha renderiza Tipo/Status vazios silenciosamente.
		ehAluno: pessoa.ehAluno ?? false,
		ehProfessor: pessoa.ehProfessor ?? false,
		statusAluno: pessoa.statusAluno ?? null,
		statusProfessor: pessoa.statusProfessor ?? null,
		ativo: pessoa.ativo,
		criadoEm: pessoa.criadoEm,
		turmas: turmasPorPessoa.get(pessoa.id) ?? [],
		interesses: pessoa.interesses ?? [],
	}));

	const marcouAluno = filtros.aluno === "1";
	const marcouProfessor = filtros.professor === "1";
	if (marcouAluno || marcouProfessor) {
		pessoas = pessoas.filter((pessoa) => (marcouAluno && pessoa.ehAluno) || (marcouProfessor && pessoa.ehProfessor));
	}
	if (filtros.status === "lead" || filtros.status === "matriculado" || filtros.status === "ex_aluno") {
		// Papéis considerados pro cruzamento com Status: só os marcados no filtro de Tipo — ou,
		// se nenhum/os dois estiverem marcados, todos os papéis que a pessoa de fato tem.
		// "ex_aluno" é exclusivo de Aluno — Professor não tem status equivalente (só
		// banco_talentos/ativo), então nunca bate por esse lado.
		pessoas = pessoas.filter((pessoa) => {
			const consideraAluno = marcouAluno !== marcouProfessor ? marcouAluno : pessoa.ehAluno;
			const consideraProfessor = marcouAluno !== marcouProfessor ? marcouProfessor : pessoa.ehProfessor;
			const bateAluno = consideraAluno && pessoa.ehAluno && pessoa.statusAluno === filtros.status;
			const bateProfessor =
				filtros.status !== "ex_aluno" &&
				consideraProfessor &&
				pessoa.ehProfessor &&
				(filtros.status === "lead" ? pessoa.statusProfessor === "banco_talentos" : pessoa.statusProfessor === "ativo");
			return bateAluno || bateProfessor;
		});
	}
	if (filtros.interesse) {
		pessoas = pessoas.filter((pessoa) => pessoa.interesses.includes(filtros.interesse as string));
	}
	if (filtros.turma) {
		pessoas = pessoas.filter((pessoa) => pessoa.turmas.includes(filtros.turma as string));
	}

	const [campoOrdenar, direcaoOrdenar] = (filtros.ordenar ?? "nome_asc").split("_");
	pessoas.sort((a, b) => {
		const comparacao =
			campoOrdenar === "criadoEm" ? (a.criadoEm ?? "").localeCompare(b.criadoEm ?? "") : a.nome.localeCompare(b.nome, "pt-BR");
		return direcaoOrdenar === "desc" ? -comparacao : comparacao;
	});

	const totalItens = pessoas.length;
	const totalPaginas = Math.max(1, Math.ceil(totalItens / ITENS_POR_PAGINA));
	const paginaSolicitada = Number.parseInt(filtros.pagina ?? "1", 10);
	const paginaAtual = Number.isFinite(paginaSolicitada) ? Math.min(Math.max(paginaSolicitada, 1), totalPaginas) : 1;

	// Todos os IDs que batem com o filtro atual, não só a página visível — "Exportar" exporta o
	// filtro inteiro (padrão de listagem com busca/filtro), não a página de 25 nem uma seleção.
	const idsFiltrados = pessoas.map((pessoa) => pessoa.id);

	const pessoasPagina: PessoaListagemRow[] = pessoas
		.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA)
		.map((pessoa) => ({
			id: pessoa.id,
			nome: pessoa.nome,
			ehAluno: pessoa.ehAluno,
			ehProfessor: pessoa.ehProfessor,
			statusAluno: pessoa.statusAluno,
			statusProfessor: pessoa.statusProfessor,
			ativo: pessoa.ativo,
			criadoEm: pessoa.criadoEm,
			turmas: pessoa.turmas,
		}));

	return (
		<Suspense fallback={null}>
			<PessoasListagem
				pessoas={pessoasPagina}
				idsFiltrados={idsFiltrados}
				totalItens={totalItens}
				paginaAtual={paginaAtual}
				totalPaginas={totalPaginas}
				itensPorPagina={ITENS_POR_PAGINA}
				opcoesInteresse={opcoesInteresse}
				opcoesTurma={opcoesTurma}
				turmasAtivas={turmasAtivas}
			/>
		</Suspense>
	);
}
