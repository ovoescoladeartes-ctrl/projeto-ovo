import type { Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { listarInteressesAtivos } from "@/core/interesses/actions";
import { normalizar } from "@/core/pessoas/normalizar";
import { toIso } from "@/core/shared/serialize";

import { PessoasListagem, type PessoaListagemRow } from "./PessoasListagem";

// Sem isso, trocar só o searchParam `arquivados`/`ordenar`/etc. na mesma rota pode servir uma
// resposta em cache do Router do Next em vez de buscar dados frescos no servidor — foi a causa
// raiz das abas Ativos/Arquivados parecendo travadas no mesmo conteúdo (round 3).
export const dynamic = "force-dynamic";

const PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];
const ITENS_POR_PAGINA = 25;

interface PessoaDoc {
	nome: string;
	ehAluno: boolean;
	ehProfessor: boolean;
	statusAluno: string | null;
	statusProfessor: string | null;
	ativo: boolean;
	criadoViaContatoId: string | null;
	criadoEm?: Timestamp;
	interesses?: string[];
	numeroMatriculaAluno?: string | null;
	numeroMatriculaProfessor?: string | null;
	email?: string | null;
	telefone?: string | null;
}

interface TurmaResumoDoc {
	nome: string;
	mensalidadeCentavos: number;
	ativo: boolean;
}

interface MatriculaResumoDoc {
	pessoaId: string;
	turmaId: string;
	status: string;
}

interface PessoasPageProps {
	searchParams: Promise<{
		aluno?: string;
		professor?: string;
		status?: string;
		interesse?: string;
		turma?: string;
		arquivados?: string;
		busca?: string;
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

	const firestore = getFirebaseAdminFirestore();
	// Arquivados mostra só ativo===false, nunca "todo mundo" — bug real do round 3, não era cache.
	const pessoasQuery = firestore.collection("pessoas").where("ativo", "==", !mostrarArquivados);
	const [pessoasSnapshot, turmasSnapshot, matriculasAtivasSnapshot, opcoesInteresse] = await Promise.all([
		pessoasQuery.get(),
		firestore.collection("turmas").where("ativo", "==", true).get(),
		firestore.collection("matriculas").where("status", "==", "ativa").get(),
		listarInteressesAtivos(),
	]);

	const turmasNomes = new Map<string, string>();
	const turmasAtivas: { id: string; nome: string; mensalidadeCentavos: number }[] = [];
	turmasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as TurmaResumoDoc;
		turmasNomes.set(doc.id, data.nome);
		turmasAtivas.push({ id: doc.id, nome: data.nome, mensalidadeCentavos: data.mensalidadeCentavos });
	});
	const opcoesTurma = Array.from(turmasNomes.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
	turmasAtivas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	const turmasPorPessoa = new Map<string, string[]>();
	matriculasAtivasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as MatriculaResumoDoc;
		const nome = turmasNomes.get(data.turmaId);
		if (nome === undefined) {
			return;
		}
		const lista = turmasPorPessoa.get(data.pessoaId) ?? [];
		lista.push(nome);
		turmasPorPessoa.set(data.pessoaId, lista);
	});

	let pessoas: PessoaFiltravel[] = pessoasSnapshot.docs.map((doc) => {
		const data = doc.data() as PessoaDoc;
		return {
			id: doc.id,
			nome: data.nome,
			// `?? false`/`?? null` defensivos — documento legado de antes do papel duplo não teria
			// esses campos gravados; sem isso a linha renderiza Tipo/Status vazios silenciosamente.
			ehAluno: data.ehAluno ?? false,
			ehProfessor: data.ehProfessor ?? false,
			statusAluno: data.statusAluno ?? null,
			statusProfessor: data.statusProfessor ?? null,
			ativo: data.ativo,
			criadoEm: toIso(data.criadoEm ?? null),
			turmas: turmasPorPessoa.get(doc.id) ?? [],
			interesses: data.interesses ?? [],
		};
	});

	const marcouAluno = filtros.aluno === "1";
	const marcouProfessor = filtros.professor === "1";
	if (marcouAluno || marcouProfessor) {
		pessoas = pessoas.filter((pessoa) => (marcouAluno && pessoa.ehAluno) || (marcouProfessor && pessoa.ehProfessor));
	}
	if (filtros.status === "lead" || filtros.status === "matriculado") {
		// Papéis considerados pro cruzamento com Status: só os marcados no filtro de Tipo — ou,
		// se nenhum/os dois estiverem marcados, todos os papéis que a pessoa de fato tem.
		pessoas = pessoas.filter((pessoa) => {
			const consideraAluno = marcouAluno !== marcouProfessor ? marcouAluno : pessoa.ehAluno;
			const consideraProfessor = marcouAluno !== marcouProfessor ? marcouProfessor : pessoa.ehProfessor;
			const bateAluno =
				consideraAluno &&
				pessoa.ehAluno &&
				(filtros.status === "lead" ? pessoa.statusAluno === "lead" : pessoa.statusAluno === "matriculado");
			const bateProfessor =
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
	if (filtros.busca) {
		const termoNormalizado = normalizar(filtros.busca);
		pessoas = pessoas.filter((pessoa) => normalizar(pessoa.nome).startsWith(termoNormalizado));
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
				totalItens={totalItens}
				paginaAtual={paginaAtual}
				totalPaginas={totalPaginas}
				itensPorPagina={ITENS_POR_PAGINA}
				opcoesInteresse={opcoesInteresse}
				opcoesTurma={opcoesTurma}
				turmasAtivas={turmasAtivas}
				podeImportar={session.role === "admin"}
			/>
		</Suspense>
	);
}
