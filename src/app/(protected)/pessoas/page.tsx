import type { Timestamp } from "firebase-admin/firestore";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { AbaAtivosArquivados } from "@/components/AbaAtivosArquivados";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { listarInteressesAtivos } from "@/core/interesses/actions";
import type { Pessoa } from "@/core/pessoas/schema";
import { toIso } from "@/core/shared/serialize";

import { CadastroTabs } from "./CadastroTabs";
import { NovaPessoaDialog } from "./NovaPessoaDialog";
import { PessoaExcluirButton } from "./PessoaExcluirButton";
import { PessoasFiltroBar } from "./PessoasFiltroBar";

const PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

const STATUS_LABELS: Record<string, string> = {
	lead: "Lead",
	matriculado: "Matriculado",
	ativo: "Ativo",
	banco_talentos: "Banco de talentos",
};

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
}

interface TurmaResumoDoc {
	nome: string;
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
	}>;
}

const MAX_TURMAS_VISIVEIS = 2;

export default async function PessoasPage({ searchParams }: PessoasPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !PESSOAS_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;
	const mostrarArquivados = filtros.arquivados === "1";

	const firestore = getFirebaseAdminFirestore();
	const pessoasQuery = mostrarArquivados
		? firestore.collection("pessoas")
		: firestore.collection("pessoas").where("ativo", "==", true);
	const [pessoasSnapshot, turmasSnapshot, matriculasAtivasSnapshot, opcoesInteresse] = await Promise.all([
		pessoasQuery.get(),
		firestore.collection("turmas").where("ativo", "==", true).get(),
		firestore.collection("matriculas").where("status", "==", "ativa").get(),
		listarInteressesAtivos(),
	]);

	const turmasNomes = new Map<string, string>();
	turmasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as TurmaResumoDoc;
		turmasNomes.set(doc.id, data.nome);
	});
	const opcoesTurma = Array.from(turmasNomes.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));

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

	let pessoas: Pessoa[] = pessoasSnapshot.docs.map((doc) => {
		const data = doc.data() as PessoaDoc;
		return {
			id: doc.id,
			nome: data.nome,
			ehAluno: data.ehAluno,
			ehProfessor: data.ehProfessor,
			statusAluno: data.statusAluno as Pessoa["statusAluno"],
			statusProfessor: data.statusProfessor as Pessoa["statusProfessor"],
			ativo: data.ativo,
			criadoViaContatoId: data.criadoViaContatoId ?? null,
			criadoEm: toIso(data.criadoEm ?? null),
			interesses: data.interesses ?? [],
			numeroMatriculaAluno: data.numeroMatriculaAluno ?? null,
			numeroMatriculaProfessor: data.numeroMatriculaProfessor ?? null,
		};
	});

	pessoas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

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
		pessoas = pessoas.filter((pessoa) => (turmasPorPessoa.get(pessoa.id) ?? []).includes(filtros.turma as string));
	}

	return (
		<div>
			<CadastroTabs />

			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Pessoas</h1>
					<p className="text-sm text-muted-foreground">Alunos e colaboradores cadastrados na escola.</p>
				</div>
				<div className="flex items-center gap-2">
					{session.role === "admin" ? (
						<Link
							href="/pessoas/importar"
							className="text-sm text-muted-foreground hover:text-foreground hover:underline"
						>
							Importar CSV
						</Link>
					) : null}
					<NovaPessoaDialog opcoesInteresse={opcoesInteresse} />
				</div>
			</div>

			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<Suspense fallback={null}>
					<PessoasFiltroBar opcoesInteresse={opcoesInteresse} opcoesTurma={opcoesTurma} />
				</Suspense>
				<Suspense fallback={null}>
					<AbaAtivosArquivados />
				</Suspense>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Nome</th>
							<th className="px-4 py-3 font-medium">Tipo</th>
							<th className="px-4 py-3 font-medium">Status</th>
							<th className="px-4 py-3 font-medium">Turma(s)</th>
							<th className="px-4 py-3 font-medium" />
						</tr>
					</thead>
					<tbody>
						{pessoas.map((pessoa) => {
							const turmasDaPessoa = turmasPorPessoa.get(pessoa.id) ?? [];
							const turmasVisiveis = turmasDaPessoa.slice(0, MAX_TURMAS_VISIVEIS).join(", ");
							const restante = turmasDaPessoa.length - MAX_TURMAS_VISIVEIS;
							return (
								<tr key={pessoa.id} className="border-b border-border last:border-0">
									<td className="px-4 py-3">
										<Link href={`/pessoas/${pessoa.id}`} className="text-foreground hover:underline">
											{pessoa.nome}
										</Link>
									</td>
									<td className="px-4 py-3 text-muted-foreground">
										{[pessoa.ehAluno ? "Aluno" : null, pessoa.ehProfessor ? "Professor" : null].filter(Boolean).join(", ")}
									</td>
									<td className="px-4 py-3">
										<div className="flex flex-wrap gap-1">
											{pessoa.ehAluno && pessoa.statusAluno !== null ? (
												<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
													{pessoa.ehProfessor ? "Aluno: " : ""}
													{STATUS_LABELS[pessoa.statusAluno]}
												</span>
											) : null}
											{pessoa.ehProfessor && pessoa.statusProfessor !== null ? (
												<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
													{pessoa.ehAluno ? "Professor: " : ""}
													{STATUS_LABELS[pessoa.statusProfessor]}
												</span>
											) : null}
										</div>
									</td>
									<td className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground" title={turmasDaPessoa.join(", ")}>
										{turmasDaPessoa.length === 0 ? "—" : `${turmasVisiveis}${restante > 0 ? ` +${restante}` : ""}`}
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex justify-end gap-1">
											<Button type="button" variant="outline" size="sm" asChild>
												<Link href={`/pessoas/${pessoa.id}`}>Editar</Link>
											</Button>
											{mostrarArquivados && !pessoa.ativo && session.role === "admin" ? (
												<PessoaExcluirButton id={pessoa.id} nome={pessoa.nome} />
											) : null}
										</div>
									</td>
								</tr>
							);
						})}
						{pessoas.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
									Nenhuma pessoa encontrada.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}
