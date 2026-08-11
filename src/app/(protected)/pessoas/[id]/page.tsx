import type { Timestamp } from "firebase-admin/firestore";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { FormaPagamento, Recebimento, RecebimentoStatus } from "@/core/financeiro/recebimentos/schema";
import type { Origem } from "@/core/financeiro/shared";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { listarInteressesAtivos } from "@/core/interesses/actions";
import type { Matricula, MatriculaStatus } from "@/core/matriculas/schema";
import type { Pessoa } from "@/core/pessoas/schema";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

import { MatriculaEditDialog } from "./MatriculaEditDialog";
import { MatricularDialog } from "./MatricularDialog";
import { MatriculaEncerrarButton } from "./MatriculaEncerrarButton";
import { PessoaCabecalho } from "./PessoaCabecalho";

const PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

interface PessoaDoc {
	tipo: string;
	nome: string;
	status: string;
	ativo: boolean;
	criadoViaContatoId: string | null;
	criadoEm?: Timestamp;
	interesses?: string[];
	numeroMatricula?: string | null;
}

interface TurmaResumoDoc {
	nome: string;
	mensalidadeCentavos: number;
	ativo: boolean;
}

interface MatriculaDoc {
	pessoaId: string;
	turmaId: string;
	dataMatricula?: Timestamp;
	mensalidadeCombinadaCentavos: number;
	motivo?: string | null;
	status: string;
	ativo: boolean;
}

interface RecebimentoDoc {
	pessoaId: string;
	turmaId: string | null;
	matriculaId?: string | null;
	valorCentavos: number;
	formaPagamento: string;
	origem: string;
	status: string;
	dataRecebimento?: Timestamp;
	ativo: boolean;
}

const MATRICULA_STATUS_LABELS: Record<string, string> = {
	ativa: "Ativa",
	encerrada: "Encerrada",
};

const RECEBIMENTO_STATUS_LABELS: Record<string, string> = {
	confirmado: "Confirmado",
	pendente: "Pendente",
	cancelado: "Cancelado",
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
}

export default async function PessoaDetalhePage({ params }: PessoaDetalhePageProps): Promise<React.ReactElement> {
	const session = await getServerSession();

	if (session === null || !PESSOAS_ROLES.includes(session.role)) {
		redirect("/");
	}

	const { id } = await params;

	const firestore = getFirebaseAdminFirestore();

	const [pessoaDoc, turmasSnapshot, matriculasSnapshot, recebimentosSnapshot, opcoesInteresse] = await Promise.all([
		firestore.collection("pessoas").doc(id).get(),
		firestore.collection("turmas").get(),
		firestore.collection("matriculas").where("pessoaId", "==", id).get(),
		firestore.collection("recebimentos").where("pessoaId", "==", id).get(),
		listarInteressesAtivos(),
	]);

	if (!pessoaDoc.exists) {
		notFound();
	}

	const data = pessoaDoc.data() as PessoaDoc;
	const pessoa: Pessoa = {
		id: pessoaDoc.id,
		tipo: data.tipo as Pessoa["tipo"],
		nome: data.nome,
		status: data.status,
		ativo: data.ativo,
		criadoViaContatoId: data.criadoViaContatoId ?? null,
		criadoEm: toIso(data.criadoEm ?? null),
		interesses: data.interesses ?? [],
		numeroMatricula: data.numeroMatricula ?? null,
	};

	const turmasNomes = new Map<string, string>();
	const turmasAtivas: { id: string; nome: string; mensalidadeCentavos: number }[] = [];
	turmasSnapshot.docs.forEach((turmaDoc) => {
		const turmaData = turmaDoc.data() as TurmaResumoDoc;
		turmasNomes.set(turmaDoc.id, turmaData.nome);
		if (turmaData.ativo) {
			turmasAtivas.push({ id: turmaDoc.id, nome: turmaData.nome, mensalidadeCentavos: turmaData.mensalidadeCentavos });
		}
	});
	turmasAtivas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	const matriculas: Matricula[] = matriculasSnapshot.docs.map((matriculaDoc) => {
		const matriculaData = matriculaDoc.data() as MatriculaDoc;
		return {
			id: matriculaDoc.id,
			pessoaId: matriculaData.pessoaId,
			turmaId: matriculaData.turmaId,
			dataMatricula: toIso(matriculaData.dataMatricula ?? null),
			mensalidadeCombinadaCentavos: matriculaData.mensalidadeCombinadaCentavos,
			motivo: matriculaData.motivo ?? null,
			status: matriculaData.status as MatriculaStatus,
			ativo: matriculaData.ativo,
		};
	});
	matriculas.sort((a, b) => (b.dataMatricula ?? "").localeCompare(a.dataMatricula ?? ""));

	const recebimentos: Recebimento[] = recebimentosSnapshot.docs.map((recebimentoDoc) => {
		const recebimentoData = recebimentoDoc.data() as RecebimentoDoc;
		return {
			id: recebimentoDoc.id,
			pessoaId: recebimentoData.pessoaId,
			turmaId: recebimentoData.turmaId,
			matriculaId: recebimentoData.matriculaId ?? null,
			valorCentavos: recebimentoData.valorCentavos,
			formaPagamento: recebimentoData.formaPagamento as FormaPagamento,
			origem: recebimentoData.origem as Origem,
			status: recebimentoData.status as RecebimentoStatus,
			dataRecebimento: toIso(recebimentoData.dataRecebimento ?? null),
			ativo: recebimentoData.ativo,
		};
	});
	recebimentos.sort((a, b) => (b.dataRecebimento ?? "").localeCompare(a.dataRecebimento ?? ""));

	return (
		<div>
			<Link href="/pessoas" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
				← Voltar para Pessoas
			</Link>

			<PessoaCabecalho pessoa={pessoa} opcoesInteresse={opcoesInteresse} />

			{pessoa.tipo === "aluno" ? (
				<div className="mt-10">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-foreground">Matrículas</h2>
						<MatricularDialog pessoaId={pessoa.id} turmas={turmasAtivas} />
					</div>

					<div className="overflow-x-auto rounded-lg border border-border bg-card">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
								<tr>
									<th className="px-4 py-3 font-medium">Turma</th>
									<th className="px-4 py-3 font-medium">Status</th>
									<th className="px-4 py-3 font-medium">Mensalidade combinada</th>
									<th className="px-4 py-3 font-medium" />
								</tr>
							</thead>
							<tbody>
								{matriculas.map((matricula) => (
									<tr key={matricula.id} className="border-b border-border last:border-0">
										<td className="px-4 py-3 text-foreground">
											{turmasNomes.get(matricula.turmaId) ?? "(turma removida)"}
										</td>
										<td className="px-4 py-3">
											<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
												{MATRICULA_STATUS_LABELS[matricula.status] ?? matricula.status}
											</span>
										</td>
										<td className="px-4 py-3 text-muted-foreground">
											{formatCentavos(matricula.mensalidadeCombinadaCentavos)}
										</td>
										<td className="px-4 py-3 text-right">
											<div className="flex justify-end gap-1">
												<MatriculaEditDialog matricula={matricula} />
												{matricula.status === "ativa" ? (
													<MatriculaEncerrarButton id={matricula.id} pessoaId={pessoa.id} />
												) : null}
											</div>
										</td>
									</tr>
								))}
								{matriculas.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
											Nenhuma matrícula ainda.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
				</div>
			) : null}

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
									<td className="px-4 py-3 text-muted-foreground">{FORMA_LABELS[recebimento.formaPagamento]}</td>
									<td className="px-4 py-3 text-muted-foreground">{ORIGEM_LABELS[recebimento.origem]}</td>
									<td className="px-4 py-3">
										<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
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
