import type { Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AbaAtivosArquivados } from "@/components/AbaAtivosArquivados";
import { CopilotoInput } from "@/components/dashboard/CopilotoInput";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { PessoaBusca } from "@/core/pessoas/actions";
import type { Turma } from "@/core/turmas/schema";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

import { NovaTurmaDialog } from "./NovaTurmaDialog";
import { TurmaEditDialog } from "./TurmaEditDialog";
import { TurmaExcluirButton } from "./TurmaExcluirButton";
import { TurmaMatriculasSheet } from "./TurmaMatriculasSheet";

const TURMAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

interface TurmaDoc {
	nome: string;
	assunto?: string;
	mensalidadeCentavos: number;
	repasseTipo: string;
	repasseValor: number;
	dataInicio?: Timestamp;
	dataFim?: Timestamp | null;
	educadorPessoaId: string | null;
	capacidadeMaxima?: number | null;
	ativo: boolean;
	wixProductId?: string | null;
	origem?: Turma["origem"];
}

interface PessoaResumoDoc {
	nome: string;
	ehAluno: boolean;
	ehProfessor: boolean;
}

interface MatriculaResumoDoc {
	pessoaId: string;
	turmaId: string;
	dataMatricula?: Timestamp;
	status: string;
}

function formatarData(iso: string | null): string {
	if (iso === null) {
		return "—";
	}
	return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatarRepasse(turma: Turma): string {
	return turma.repasseTipo === "percentual" ? `${turma.repasseValor}%` : formatCentavos(turma.repasseValor);
}

interface TurmasPageProps {
	searchParams: Promise<{ arquivados?: string }>;
}

export default async function TurmasPage({ searchParams }: TurmasPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !TURMAS_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;
	const mostrarArquivados = filtros.arquivados === "1";

	const firestore = getFirebaseAdminFirestore();
	const turmasQuery = mostrarArquivados
		? firestore.collection("turmas")
		: firestore.collection("turmas").where("ativo", "==", true);
	const [turmasSnapshot, pessoasSnapshot, matriculasAtivasSnapshot] = await Promise.all([
		turmasQuery.get(),
		firestore.collection("pessoas").get(),
		firestore.collection("matriculas").where("status", "==", "ativa").get(),
	]);

	const pessoasNomes = new Map<string, string>();
	const colaboradoresPorId = new Map<string, PessoaBusca>();
	pessoasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as PessoaResumoDoc;
		pessoasNomes.set(doc.id, data.nome);
		if (data.ehProfessor) {
			colaboradoresPorId.set(doc.id, { id: doc.id, nome: data.nome, ehAluno: data.ehAluno, ehProfessor: true });
		}
	});

	const matriculasPorTurma = new Map<
		string,
		{ matriculaId: string; pessoaId: string; pessoaNome: string; dataMatricula: string | null }[]
	>();
	matriculasAtivasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as MatriculaResumoDoc;
		const lista = matriculasPorTurma.get(data.turmaId) ?? [];
		lista.push({
			matriculaId: doc.id,
			pessoaId: data.pessoaId,
			pessoaNome: pessoasNomes.get(data.pessoaId) ?? "(pessoa removida)",
			dataMatricula: toIso(data.dataMatricula ?? null),
		});
		matriculasPorTurma.set(data.turmaId, lista);
	});

	const turmas: Turma[] = turmasSnapshot.docs.map((doc) => {
		const data = doc.data() as TurmaDoc;
		return {
			id: doc.id,
			nome: data.nome,
			assunto: data.assunto ?? "",
			mensalidadeCentavos: data.mensalidadeCentavos,
			repasseTipo: data.repasseTipo as Turma["repasseTipo"],
			repasseValor: data.repasseValor,
			dataInicio: toIso(data.dataInicio ?? null),
			dataFim: toIso(data.dataFim ?? null),
			educadorPessoaId: data.educadorPessoaId ?? null,
			capacidadeMaxima: data.capacidadeMaxima ?? null,
			ativo: data.ativo,
			wixProductId: data.wixProductId ?? null,
			origem: data.origem ?? "manual",
		};
	});

	turmas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	return (
		<div>
			<div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Turmas</h1>
				<CopilotoInput />
				<NovaTurmaDialog />
			</div>

			<div className="mb-4 flex justify-end">
				<Suspense fallback={null}>
					<AbaAtivosArquivados />
				</Suspense>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Nome</th>
							<th className="px-4 py-3 font-medium">Assunto</th>
							<th className="px-4 py-3 font-medium">Mensalidade</th>
							<th className="px-4 py-3 font-medium">Repasse</th>
							<th className="px-4 py-3 font-medium">Período</th>
							<th className="px-4 py-3 font-medium">Vagas</th>
							<th className="px-4 py-3 font-medium" />
						</tr>
					</thead>
					<tbody>
						{turmas.map((turma) => {
							const alunos = matriculasPorTurma.get(turma.id) ?? [];
							return (
								<tr key={turma.id} className="border-b border-border last:border-0">
									<td className="px-4 py-3 text-foreground">
										<div className="flex items-center gap-2">
											{turma.nome}
											{turma.wixProductId !== null ? (
												<span className="inline-block shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
													Origem: Wix
												</span>
											) : null}
										</div>
									</td>
									<td className="px-4 py-3 text-muted-foreground">{turma.assunto || "—"}</td>
									<td className="px-4 py-3 text-muted-foreground">{formatCentavos(turma.mensalidadeCentavos)}</td>
									<td className="px-4 py-3 text-muted-foreground">{formatarRepasse(turma)}</td>
									<td className="px-4 py-3 text-muted-foreground">
										{formatarData(turma.dataInicio)} – {formatarData(turma.dataFim)}
									</td>
									<td className="px-4 py-3 text-muted-foreground">
										{alunos.length}
										{turma.capacidadeMaxima !== null ? ` / ${turma.capacidadeMaxima}` : ""}
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex justify-end gap-1">
											<TurmaMatriculasSheet turmaNome={turma.nome} alunos={alunos} />
											<TurmaEditDialog
												turma={turma}
												educadorInicial={turma.educadorPessoaId ? (colaboradoresPorId.get(turma.educadorPessoaId) ?? null) : null}
												matriculasAtivasCount={alunos.length}
											/>
											{mostrarArquivados && !turma.ativo && session.role === "admin" ? (
												<TurmaExcluirButton id={turma.id} nome={turma.nome} />
											) : null}
										</div>
									</td>
								</tr>
							);
						})}
						{turmas.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
									Nenhuma turma cadastrada ainda.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}
