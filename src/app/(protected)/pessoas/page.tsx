import type { Timestamp } from "firebase-admin/firestore";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { Pessoa } from "@/core/pessoas/schema";
import { toIso } from "@/core/shared/serialize";

import { NovaPessoaDialog } from "./NovaPessoaDialog";
import { PessoaRowActions } from "./PessoaRowActions";
import { PessoasFiltroBar } from "./PessoasFiltroBar";

const PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

const STATUS_LABELS: Record<string, string> = {
	lead: "Lead",
	matriculado: "Matriculado",
	ativo: "Ativo",
	banco_talentos: "Banco de talentos",
};

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

interface PessoasPageProps {
	searchParams: Promise<{ tipo?: string; status?: string }>;
}

export default async function PessoasPage({ searchParams }: PessoasPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !PESSOAS_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;

	const snapshot = await getFirebaseAdminFirestore().collection("pessoas").where("ativo", "==", true).get();

	let pessoas: Pessoa[] = snapshot.docs.map((doc) => {
		const data = doc.data() as PessoaDoc;
		return {
			id: doc.id,
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
	});

	pessoas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	if (filtros.tipo) {
		pessoas = pessoas.filter((pessoa) => pessoa.tipo === filtros.tipo);
	}
	if (filtros.status) {
		pessoas = pessoas.filter((pessoa) => pessoa.status === filtros.status);
	}

	return (
		<div>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Pessoas</h1>
					<p className="text-sm text-muted-foreground">Alunos e colaboradores cadastrados na escola.</p>
				</div>
				<div className="flex items-center gap-2">
					<Link
						href="/pessoas/turmas"
						className="text-sm text-muted-foreground hover:text-foreground hover:underline"
					>
						Turmas
					</Link>
					{session.role === "admin" ? (
						<Link
							href="/pessoas/importar"
							className="text-sm text-muted-foreground hover:text-foreground hover:underline"
						>
							Importar CSV
						</Link>
					) : null}
					<NovaPessoaDialog />
				</div>
			</div>

			<div className="mb-4">
				<Suspense fallback={null}>
					<PessoasFiltroBar />
				</Suspense>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Nome</th>
							<th className="px-4 py-3 font-medium">Tipo</th>
							<th className="px-4 py-3 font-medium">Status</th>
							<th className="px-4 py-3 font-medium" />
						</tr>
					</thead>
					<tbody>
						{pessoas.map((pessoa) => (
							<tr key={pessoa.id} className="border-b border-border last:border-0">
								<td className="px-4 py-3">
									<Link href={`/pessoas/${pessoa.id}`} className="text-foreground hover:underline">
										{pessoa.nome}
									</Link>
								</td>
								<td className="px-4 py-3 capitalize text-muted-foreground">{pessoa.tipo}</td>
								<td className="px-4 py-3">
									<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
										{STATUS_LABELS[pessoa.status] ?? pessoa.status}
									</span>
								</td>
								<td className="px-4 py-3 text-right">
									<PessoaRowActions id={pessoa.id} />
								</td>
							</tr>
						))}
						{pessoas.length === 0 ? (
							<tr>
								<td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
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
