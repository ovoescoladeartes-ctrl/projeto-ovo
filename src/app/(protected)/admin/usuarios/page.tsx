import { redirect } from "next/navigation";

import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { getServerSession } from "@/core/auth/getServerSession";
import { PENDING_ACCESS } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { RoleEditDialog } from "./RoleEditDialog";

interface UsuarioRow {
	uid: string;
	nome: string;
	email: string | null;
	role: string;
}

// Cores indicativas de status (regra 18 do design.md): amarelo=pendente (acesso incompleto),
// azul=papel concedido (admin/financeiro/comunicacao/educador — categórico, não é bom nem ruim).
function badgeClassName(role: string): string {
	if (role === PENDING_ACCESS) {
		return "bg-amber-100 text-amber-800";
	}
	return "bg-blue-100 text-blue-800";
}

export default async function AdminUsuariosPage(): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só no menu do layout) — cada rota
	// protege a si mesma, constitution.md §5.2.
	if (session === null || session.role !== "admin") {
		redirect("/");
	}

	const snapshot = await getFirebaseAdminFirestore()
		.collection("users")
		.orderBy("criadoEm", "desc")
		.get();

	const usuarios: UsuarioRow[] = snapshot.docs.map((doc) => {
		const data = doc.data() as { nome?: string; email?: string | null; role?: string };
		return {
			uid: doc.id,
			nome: data.nome ?? "(sem nome)",
			email: data.email ?? null,
			role: data.role ?? PENDING_ACCESS,
		};
	});

	return (
		<div>
			<PageBreadcrumb
				items={[{ label: "Dashboard", href: "/" }, { label: "Configurações" }, { label: "Controle de acessos" }]}
			/>
			<h1 className="mb-6 mt-2 text-2xl font-bold text-foreground sm:text-3xl">Controle de acessos</h1>

			<div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
						<tr>
							<th className="px-4 py-3 font-medium">Nome</th>
							<th className="px-4 py-3 font-medium">E-mail</th>
							<th className="px-4 py-3 font-medium">Papel atual</th>
							<th className="px-4 py-3 font-medium" />
						</tr>
					</thead>
					<tbody>
						{usuarios.map((usuario) => (
							<tr key={usuario.uid} className="border-b border-slate-100 last:border-0">
								<td className="px-4 py-3 text-slate-900">{usuario.nome}</td>
								<td className="px-4 py-3 text-slate-500">{usuario.email ?? "—"}</td>
								<td className="px-4 py-3">
									<span
										className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeClassName(usuario.role)}`}
									>
										{usuario.role}
									</span>
								</td>
								<td className="px-4 py-3">
									<RoleEditDialog uid={usuario.uid} nome={usuario.nome} currentRole={usuario.role} />
								</td>
							</tr>
						))}
						{usuarios.length === 0 ? (
							<tr>
								<td colSpan={4} className="px-4 py-6 text-center text-slate-400">
									Nenhum usuário cadastrado ainda.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}
