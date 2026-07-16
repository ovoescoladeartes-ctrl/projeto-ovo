import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/core/auth/getAuthenticatedUser";
import { PENDING_ACCESS } from "@/core/auth/Role";

import { RefreshAccessButton } from "./RefreshAccessButton";

interface ProtectedLayoutProps {
	children: React.ReactNode;
}

export default async function ProtectedLayout({
	children,
}: ProtectedLayoutProps): Promise<React.ReactElement> {
	const user = await getAuthenticatedUser();

	if (user === null) {
		redirect("/login");
	}

	if (user.role === PENDING_ACCESS) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
				<div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
					<h1 className="mb-2 text-lg font-semibold text-slate-900 sm:text-xl">
						Acesso pendente
					</h1>
					<p className="text-sm text-slate-500">
						Sua conta ainda não tem acesso liberado a nenhum módulo. Peça a um admin para liberar
						seu papel de acesso.
					</p>
					<p className="mt-3 text-xs text-slate-400">
						Se um admin já liberou seu acesso, clique abaixo em vez de sair e entrar de novo.
					</p>
					<RefreshAccessButton />
				</div>
			</main>
		);
	}

	return (
		<div className="flex min-h-screen flex-col md:flex-row">
			<nav className="w-full shrink-0 border-b border-slate-200 bg-white px-4 py-3 md:w-56 md:border-b-0 md:border-r md:px-4 md:py-6">
				<p className="mb-3 text-sm font-semibold text-slate-900 md:mb-6">OVO</p>
				<ul className="flex flex-row gap-2 text-sm md:flex-col md:gap-1">
					<li>
						<span className="block whitespace-nowrap rounded-md bg-slate-100 px-3 py-2 font-medium text-slate-900">
							Financeiro
						</span>
					</li>
					<li>
						<span className="block cursor-not-allowed whitespace-nowrap px-3 py-2 text-slate-400">
							Comunicação <span className="text-xs">(em breve)</span>
						</span>
					</li>
					{user.role === "admin" ? (
						<li>
							<Link
								href="/admin/usuarios"
								className="block whitespace-nowrap rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
							>
								Usuários
							</Link>
						</li>
					) : null}
				</ul>
			</nav>
			<main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
		</div>
	);
}
