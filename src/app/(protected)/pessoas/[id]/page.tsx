import type { Timestamp } from "firebase-admin/firestore";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { Matricula, MatriculaStatus } from "@/core/matriculas/schema";
import type { Pessoa } from "@/core/pessoas/schema";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

import { MatricularDialog } from "./MatricularDialog";
import { MatriculaEncerrarButton } from "./MatriculaEncerrarButton";
import { PessoaEditForm } from "./PessoaEditForm";

const PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

interface PessoaDoc {
	tipo: string;
	nome: string;
	status: string;
	ativo: boolean;
	criadoViaContatoId: string | null;
	criadoEm?: Timestamp;
	email?: string | null;
	telefone?: string | null;
	wixContactId?: string | null;
	origem?: Pessoa["origem"];
}

interface TurmaResumoDoc {
	nome: string;
	ativo: boolean;
}

interface MatriculaDoc {
	pessoaId: string;
	turmaId: string;
	dataMatricula?: Timestamp;
	mensalidadeCombinadaCentavos: number;
	status: string;
	ativo: boolean;
}

const MATRICULA_STATUS_LABELS: Record<string, string> = {
	ativa: "Ativa",
	encerrada: "Encerrada",
};

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

	const [pessoaDoc, turmasSnapshot, matriculasSnapshot] = await Promise.all([
		firestore.collection("pessoas").doc(id).get(),
		firestore.collection("turmas").get(),
		firestore.collection("matriculas").where("pessoaId", "==", id).get(),
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
		email: data.email ?? null,
		telefone: data.telefone ?? null,
		wixContactId: data.wixContactId ?? null,
		origem: data.origem ?? "manual",
	};

	const turmasNomes = new Map<string, string>();
	const turmasAtivas: { id: string; nome: string }[] = [];
	turmasSnapshot.docs.forEach((turmaDoc) => {
		const turmaData = turmaDoc.data() as TurmaResumoDoc;
		turmasNomes.set(turmaDoc.id, turmaData.nome);
		if (turmaData.ativo) {
			turmasAtivas.push({ id: turmaDoc.id, nome: turmaData.nome });
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
			status: matriculaData.status as MatriculaStatus,
			ativo: matriculaData.ativo,
		};
	});
	matriculas.sort((a, b) => (b.dataMatricula ?? "").localeCompare(a.dataMatricula ?? ""));

	return (
		<div>
			<Link href="/pessoas" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
				← Voltar para Pessoas
			</Link>

			<div className="mt-3 mb-6">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">{pessoa.nome}</h1>
				<p className="text-sm capitalize text-muted-foreground">
					{pessoa.tipo}
					{pessoa.ativo ? "" : " · inativo"}
				</p>
			</div>

			<PessoaEditForm pessoa={pessoa} />

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
									<th className="px-4 py-3 font-medium">Mensalidade combinada</th>
									<th className="px-4 py-3 font-medium">Status</th>
									<th className="px-4 py-3 font-medium" />
								</tr>
							</thead>
							<tbody>
								{matriculas.map((matricula) => (
									<tr key={matricula.id} className="border-b border-border last:border-0">
										<td className="px-4 py-3 text-foreground">
											{turmasNomes.get(matricula.turmaId) ?? "(turma removida)"}
										</td>
										<td className="px-4 py-3 text-muted-foreground">
											{formatCentavos(matricula.mensalidadeCombinadaCentavos)}
										</td>
										<td className="px-4 py-3">
											<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
												{MATRICULA_STATUS_LABELS[matricula.status] ?? matricula.status}
											</span>
										</td>
										<td className="px-4 py-3 text-right">
											{matricula.status === "ativa" ? (
												<MatriculaEncerrarButton id={matricula.id} pessoaId={pessoa.id} />
											) : null}
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
		</div>
	);
}
