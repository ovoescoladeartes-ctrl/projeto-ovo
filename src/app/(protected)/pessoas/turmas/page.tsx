import type { Timestamp } from "firebase-admin/firestore";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { Turma } from "@/core/turmas/schema";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

import { NovaTurmaDialog } from "./NovaTurmaDialog";
import { TurmaEditDialog } from "./TurmaEditDialog";
import { TurmaInativarButton } from "./TurmaInativarButton";

const TURMAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

interface TurmaDoc {
	nome: string;
	mensalidadeCentavos: number;
	repasseTipo: string;
	repasseValor: number;
	dataInicio?: Timestamp;
	dataFim?: Timestamp | null;
	educadorPessoaId: string | null;
	ativo: boolean;
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

export default async function TurmasPage(): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !TURMAS_ROLES.includes(session.role)) {
		redirect("/");
	}

	const snapshot = await getFirebaseAdminFirestore().collection("turmas").where("ativo", "==", true).get();

	const turmas: Turma[] = snapshot.docs.map((doc) => {
		const data = doc.data() as TurmaDoc;
		return {
			id: doc.id,
			nome: data.nome,
			mensalidadeCentavos: data.mensalidadeCentavos,
			repasseTipo: data.repasseTipo as Turma["repasseTipo"],
			repasseValor: data.repasseValor,
			dataInicio: toIso(data.dataInicio ?? null),
			dataFim: toIso(data.dataFim ?? null),
			educadorPessoaId: data.educadorPessoaId ?? null,
			ativo: data.ativo,
		};
	});

	turmas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	return (
		<div>
			<Link href="/pessoas" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
				← Voltar para Pessoas
			</Link>

			<div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Turmas</h1>
					<p className="text-sm text-muted-foreground">Cursos/turmas oferecidos pela escola.</p>
				</div>
				<NovaTurmaDialog />
			</div>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Nome</th>
							<th className="px-4 py-3 font-medium">Mensalidade</th>
							<th className="px-4 py-3 font-medium">Repasse</th>
							<th className="px-4 py-3 font-medium">Período</th>
							<th className="px-4 py-3 font-medium" />
						</tr>
					</thead>
					<tbody>
						{turmas.map((turma) => (
							<tr key={turma.id} className="border-b border-border last:border-0">
								<td className="px-4 py-3 text-foreground">{turma.nome}</td>
								<td className="px-4 py-3 text-muted-foreground">{formatCentavos(turma.mensalidadeCentavos)}</td>
								<td className="px-4 py-3 text-muted-foreground">{formatarRepasse(turma)}</td>
								<td className="px-4 py-3 text-muted-foreground">
									{formatarData(turma.dataInicio)} – {formatarData(turma.dataFim)}
								</td>
								<td className="px-4 py-3 text-right">
									<div className="flex justify-end gap-1">
										<TurmaEditDialog turma={turma} />
										<TurmaInativarButton id={turma.id} />
									</div>
								</td>
							</tr>
						))}
						{turmas.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
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
