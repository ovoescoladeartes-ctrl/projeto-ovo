import type { Timestamp } from "firebase-admin/firestore";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AbaAtivosArquivados } from "@/components/AbaAtivosArquivados";
import { CopilotoInput } from "@/components/dashboard/CopilotoInput";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { PessoaBusca } from "@/core/pessoas/actions";
import type { Turma } from "@/core/turmas/schema";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos, parseCentavosInput } from "@/lib/currency";
import { cn } from "@/lib/utils";

import { NovaTurmaDialog } from "./NovaTurmaDialog";
import { TurmaEditDialog } from "./TurmaEditDialog";
import { TurmaExcluirButton } from "./TurmaExcluirButton";
import { TurmaMatriculasSheet } from "./TurmaMatriculasSheet";
import { TurmasFiltroBar } from "./TurmasFiltroBar";

// Sem isso, trocar só o searchParam `arquivados` na mesma rota pode servir uma resposta em
// cache do Router do Next em vez de buscar dados frescos no servidor (mesma causa raiz corrigida
// em pessoas/page.tsx).
export const dynamic = "force-dynamic";

const TURMAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

interface TurmaDoc {
	nome: string;
	assunto?: string;
	tipo?: Turma["tipo"];
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

const TIPO_LABELS: Record<string, string> = { curso: "Curso", oficina: "Oficina" };

type CampoOrdenar = "nome" | "tipo" | "assunto" | "mensalidade" | "repasse" | "periodo" | "vagas";

interface TurmasSearchParams {
	arquivados?: string;
	busca?: string;
	tipo?: string;
	assunto?: string;
	repasseTipo?: string;
	mensalidadeMin?: string;
	mensalidadeMax?: string;
	inicioDe?: string;
	inicioAte?: string;
	vagasMin?: string;
	vagasMax?: string;
	ordenar?: string;
}

/**
 * Constrói a URL de ordenação preservando todo filtro já aplicado — mesma lógica de
 * `hrefOrdenar`/`iconeOrdenar` em `PessoasListagem.tsx`, só que como função pura (sem
 * `useSearchParams`) porque esta página nunca precisou de um Client Component próprio: os
 * `searchParams` já chegam prontos no Server Component, e um `<Link>` com `href` fixo não precisa
 * de hook nenhum pra funcionar.
 */
function hrefOrdenarTurmas(filtros: TurmasSearchParams, campo: CampoOrdenar): string {
	const atual = filtros.ordenar ?? "nome_asc";
	const [campoAtual, direcaoAtual] = atual.split("_");
	const novaDirecao = campoAtual === campo && direcaoAtual === "asc" ? "desc" : "asc";

	const params = new URLSearchParams();
	Object.entries(filtros).forEach(([chave, valor]) => {
		if (valor !== undefined && chave !== "ordenar") {
			params.set(chave, valor);
		}
	});
	params.set("ordenar", `${campo}_${novaDirecao}`);

	const query = params.toString();
	return query.length > 0 ? `/pessoas/turmas?${query}` : "/pessoas/turmas";
}

function IconeOrdenarTurmas({ filtros, campo }: { filtros: TurmasSearchParams; campo: CampoOrdenar }): React.ReactElement {
	const atual = filtros.ordenar ?? "nome_asc";
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

function CabecalhoOrdenavel({
	filtros,
	campo,
	label,
}: {
	filtros: TurmasSearchParams;
	campo: CampoOrdenar;
	label: string;
}): React.ReactElement {
	return (
		<th className="px-4 py-3 font-medium">
			<Link href={hrefOrdenarTurmas(filtros, campo)} className="inline-flex items-center gap-1 hover:text-foreground">
				{label}
				<IconeOrdenarTurmas filtros={filtros} campo={campo} />
			</Link>
		</th>
	);
}

interface TurmasPageProps {
	searchParams: Promise<TurmasSearchParams>;
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
	// Arquivadas mostra só ativo===false, nunca "todo mundo" (mesmo bug já corrigido em pessoas/page.tsx).
	const turmasQuery = firestore.collection("turmas").where("ativo", "==", !mostrarArquivados);
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

	const todasTurmas: Turma[] = turmasSnapshot.docs.map((doc) => {
		const data = doc.data() as TurmaDoc;
		return {
			id: doc.id,
			nome: data.nome,
			assunto: data.assunto ?? "",
			tipo: data.tipo ?? null,
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

	// Opções dos Selects de filtro vêm dos dados reais (mesmo padrão de `opcoesInteresse`/
	// `opcoesTurma` em pessoas/page.tsx) — só oferece filtrar por um Assunto que alguma turma
	// realmente tem.
	const opcoesAssunto = Array.from(new Set(todasTurmas.map((turma) => turma.assunto).filter((assunto) => assunto !== "")))
		.sort((a, b) => a.localeCompare(b, "pt-BR"));

	function vagasOcupadas(turmaId: string): number {
		return matriculasPorTurma.get(turmaId)?.length ?? 0;
	}

	let turmas = todasTurmas;

	if (filtros.busca !== undefined && filtros.busca.trim() !== "") {
		const buscaNormalizada = filtros.busca.trim().toLowerCase();
		turmas = turmas.filter((turma) => turma.nome.toLowerCase().includes(buscaNormalizada));
	}
	if (filtros.tipo === "curso" || filtros.tipo === "oficina") {
		turmas = turmas.filter((turma) => turma.tipo === filtros.tipo);
	}
	if (filtros.assunto !== undefined && filtros.assunto !== "") {
		turmas = turmas.filter((turma) => turma.assunto === filtros.assunto);
	}
	if (filtros.repasseTipo === "percentual" || filtros.repasseTipo === "fixo") {
		turmas = turmas.filter((turma) => turma.repasseTipo === filtros.repasseTipo);
	}
	const mensalidadeMinCentavos = filtros.mensalidadeMin ? parseCentavosInput(filtros.mensalidadeMin) : null;
	if (mensalidadeMinCentavos !== null) {
		turmas = turmas.filter((turma) => turma.mensalidadeCentavos >= mensalidadeMinCentavos);
	}
	const mensalidadeMaxCentavos = filtros.mensalidadeMax ? parseCentavosInput(filtros.mensalidadeMax) : null;
	if (mensalidadeMaxCentavos !== null) {
		turmas = turmas.filter((turma) => turma.mensalidadeCentavos <= mensalidadeMaxCentavos);
	}
	if (filtros.inicioDe !== undefined && filtros.inicioDe !== "") {
		turmas = turmas.filter((turma) => turma.dataInicio !== null && turma.dataInicio.slice(0, 10) >= filtros.inicioDe!);
	}
	if (filtros.inicioAte !== undefined && filtros.inicioAte !== "") {
		turmas = turmas.filter((turma) => turma.dataInicio !== null && turma.dataInicio.slice(0, 10) <= filtros.inicioAte!);
	}
	const vagasMin = filtros.vagasMin !== undefined ? Number.parseInt(filtros.vagasMin, 10) : null;
	if (vagasMin !== null && Number.isFinite(vagasMin)) {
		turmas = turmas.filter((turma) => vagasOcupadas(turma.id) >= vagasMin);
	}
	const vagasMax = filtros.vagasMax !== undefined ? Number.parseInt(filtros.vagasMax, 10) : null;
	if (vagasMax !== null && Number.isFinite(vagasMax)) {
		turmas = turmas.filter((turma) => vagasOcupadas(turma.id) <= vagasMax);
	}

	const [campoOrdenar, direcaoOrdenar] = (filtros.ordenar ?? "nome_asc").split("_") as [CampoOrdenar, string];
	turmas = [...turmas].sort((a, b) => {
		let comparacao: number;
		switch (campoOrdenar) {
			case "tipo":
				comparacao = (a.tipo ?? "").localeCompare(b.tipo ?? "");
				break;
			case "assunto":
				comparacao = (a.assunto || "").localeCompare(b.assunto || "", "pt-BR");
				break;
			case "mensalidade":
				comparacao = a.mensalidadeCentavos - b.mensalidadeCentavos;
				break;
			case "repasse":
				comparacao = a.repasseValor - b.repasseValor;
				break;
			case "periodo":
				comparacao = (a.dataInicio ?? "9999").localeCompare(b.dataInicio ?? "9999");
				break;
			case "vagas":
				comparacao = vagasOcupadas(a.id) - vagasOcupadas(b.id);
				break;
			default:
				comparacao = a.nome.localeCompare(b.nome, "pt-BR");
		}
		return direcaoOrdenar === "desc" ? -comparacao : comparacao;
	});

	return (
		<div>
			<PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Cadastro" }, { label: "Turmas" }]} />
			<div className="mb-6 mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Turmas</h1>
				<CopilotoInput />
				<NovaTurmaDialog />
			</div>

			<div className="mb-6">
				<Suspense fallback={null}>
					<AbaAtivosArquivados />
				</Suspense>
			</div>

			<div className="mb-6">
				<Suspense fallback={null}>
					<TurmasFiltroBar opcoesAssunto={opcoesAssunto} />
				</Suspense>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<CabecalhoOrdenavel filtros={filtros} campo="nome" label="Nome" />
							<CabecalhoOrdenavel filtros={filtros} campo="tipo" label="Tipo" />
							<CabecalhoOrdenavel filtros={filtros} campo="assunto" label="Assunto" />
							<CabecalhoOrdenavel filtros={filtros} campo="mensalidade" label="Mensalidade" />
							<CabecalhoOrdenavel filtros={filtros} campo="repasse" label="Repasse" />
							<CabecalhoOrdenavel filtros={filtros} campo="periodo" label="Período" />
							<CabecalhoOrdenavel filtros={filtros} campo="vagas" label="Vagas" />
							<th className="px-4 py-3 font-medium" />
						</tr>
					</thead>
					<tbody>
						{turmas.map((turma) => {
							const alunos = matriculasPorTurma.get(turma.id) ?? [];
							return (
								<tr key={turma.id} className="border-b border-border last:border-0">
									<td className="px-4 py-3 text-foreground">{turma.nome}</td>
									<td className="px-4 py-3 text-muted-foreground">
										{turma.tipo !== null ? (TIPO_LABELS[turma.tipo] ?? turma.tipo) : "—"}
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
								<td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
									{todasTurmas.length === 0 ? "Nenhuma turma cadastrada ainda." : "Nenhuma turma bate com os filtros."}
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}
