import type { Timestamp } from "firebase-admin/firestore";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { lerMatriculas } from "@/core/db/matriculas";
import { lerRecebimentos } from "@/core/db/recebimentos";
import { lerTurmas } from "@/core/db/turmas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { listarInteressesAtivos } from "@/core/interesses/actions";
import type { Pessoa } from "@/core/pessoas/schema";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

import { PessoaDetalheEditor } from "./PessoaDetalheEditor";

const PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

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
	wixContactId?: string | null;
	origem?: Pessoa["origem"];
}

const RECEBIMENTO_STATUS_LABELS: Record<string, string> = {
	confirmado: "Confirmado",
	pendente: "Pendente",
	cancelado: "Cancelado",
};

// Cores indicativas de status (regra 18 do design.md): verde=confirmado, amarelo=pendente, vermelho=cancelado.
const RECEBIMENTO_STATUS_CORES: Record<string, string> = {
	confirmado: "bg-emerald-100 text-emerald-800",
	pendente: "bg-amber-100 text-amber-800",
	cancelado: "bg-red-100 text-red-800",
};

const ORIGEM_LABELS: Record<string, string> = { wix: "Wix", manual: "Manual" };

const FORMA_LABELS: Record<string, string> = {
	pix: "Pix",
	dinheiro: "Dinheiro",
	cartao: "Cartão",
	transferencia: "Transferência",
	boleto: "Boleto",
	outro: "Outro",
};

function formatarData(iso: string | null): string {
	if (iso === null) {
		return "—";
	}
	return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

interface PessoaDetalhePageProps {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ papelParaAdicionar?: string }>;
}

export default async function PessoaDetalhePage({ params, searchParams }: PessoaDetalhePageProps): Promise<React.ReactElement> {
	const session = await getServerSession();

	if (session === null || !PESSOAS_ROLES.includes(session.role)) {
		redirect("/");
	}

	const { id } = await params;
	const filtros = await searchParams;
	const papelParaAdicionarInicial =
		filtros.papelParaAdicionar === "aluno" || filtros.papelParaAdicionar === "professor" ? filtros.papelParaAdicionar : null;

	// Doc da própria pessoa continua leitura direta (não `lerPessoas()`) — rota pouco acessada,
	// leitura única já é mais barata que puxar a coleção inteira só pra achar 1 registro (Fase 3 do
	// plano de redução de leituras).
	const [pessoaDoc, todasTurmas, todasMatriculas, todosRecebimentos, opcoesInteresse] = await Promise.all([
		getFirebaseAdminFirestore().collection("pessoas").doc(id).get(),
		lerTurmas(),
		lerMatriculas(),
		lerRecebimentos(),
		listarInteressesAtivos(),
	]);

	if (!pessoaDoc.exists) {
		notFound();
	}

	const matriculasSnapshotDocs = todasMatriculas.filter((matricula) => matricula.pessoaId === id);
	const recebimentosSnapshotDocs = todosRecebimentos.filter((recebimento) => recebimento.pessoaId === id);

	const data = pessoaDoc.data() as PessoaDoc;
	const pessoa: Pessoa = {
		id: pessoaDoc.id,
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
		email: data.email ?? null,
		telefone: data.telefone ?? null,
		wixContactId: data.wixContactId ?? null,
		origem: data.origem ?? "manual",
	};

	const turmasNomes = new Map<string, string>();
	const turmasAtivas: { id: string; nome: string; mensalidadeCentavos: number }[] = [];
	const turmasLecionadas: { id: string; nome: string; ativo: boolean }[] = [];
	todasTurmas.forEach((turma) => {
		turmasNomes.set(turma.id, turma.nome);
		if (turma.ativo) {
			turmasAtivas.push({ id: turma.id, nome: turma.nome, mensalidadeCentavos: turma.mensalidadeCentavos });
		}
		if (turma.educadorPessoaId === id) {
			turmasLecionadas.push({ id: turma.id, nome: turma.nome, ativo: turma.ativo });
		}
	});
	turmasAtivas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
	turmasLecionadas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	const matriculas = [...matriculasSnapshotDocs].sort((a, b) => (b.dataMatricula ?? "").localeCompare(a.dataMatricula ?? ""));
	const matriculasComTurma = matriculas.map((matricula) => ({
		matricula,
		turmaNome: turmasNomes.get(matricula.turmaId) ?? "(turma removida)",
	}));

	const recebimentos = [...recebimentosSnapshotDocs].sort((a, b) => (b.dataRecebimento ?? "").localeCompare(a.dataRecebimento ?? ""));

	return (
		<div>
			<PessoaDetalheEditor
				pessoa={pessoa}
				opcoesInteresse={opcoesInteresse}
				matriculas={matriculasComTurma}
				turmasAtivas={turmasAtivas}
				turmasLecionadas={turmasLecionadas}
				papelParaAdicionarInicial={papelParaAdicionarInicial}
				isAdmin={session.role === "admin"}
			/>

			<div className="mt-10">
				<h2 className="mb-3 text-sm font-semibold text-foreground">Recebimentos</h2>
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
							<tr>
								<th className="px-4 py-3 font-medium">Valor</th>
								<th className="px-4 py-3 font-medium">Forma</th>
								<th className="px-4 py-3 font-medium">Origem</th>
								<th className="px-4 py-3 font-medium">Status</th>
								<th className="px-4 py-3 font-medium">Data</th>
							</tr>
						</thead>
						<tbody>
							{recebimentos.map((recebimento) => (
								<tr key={recebimento.id} className="border-b border-border last:border-0">
									<td className="px-4 py-3 text-foreground">{formatCentavos(recebimento.valorCentavos)}</td>
									<td className="px-4 py-3 text-muted-foreground">
										{recebimento.origem === "wix" ? "—" : FORMA_LABELS[recebimento.formaPagamento]}
									</td>
									<td className="px-4 py-3 text-muted-foreground">{ORIGEM_LABELS[recebimento.origem]}</td>
									<td className="px-4 py-3">
										<span
											className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RECEBIMENTO_STATUS_CORES[recebimento.status] ?? "bg-secondary text-secondary-foreground"}`}
										>
											{RECEBIMENTO_STATUS_LABELS[recebimento.status]}
										</span>
									</td>
									<td className="px-4 py-3 text-muted-foreground">{formatarData(recebimento.dataRecebimento)}</td>
								</tr>
							))}
							{recebimentos.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
										Nenhum recebimento encontrado.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
