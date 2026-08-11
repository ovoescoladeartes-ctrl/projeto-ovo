import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarShell } from "@/components/shell/SidebarShell";
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
			<main className="flex min-h-screen items-center justify-center bg-background px-4">
				<Card className="w-full max-w-sm text-center">
					<CardHeader>
						<CardTitle>Acesso pendente</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Sua conta ainda não tem acesso liberado a nenhum módulo. Peça a um admin para
							liberar seu papel de acesso.
						</p>
						<p className="mt-3 text-xs text-muted-foreground/70">
							Se um admin já liberou seu acesso, clique abaixo em vez de sair e entrar de novo.
						</p>
						<RefreshAccessButton />
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<SidebarShell user={{ displayName: user.displayName, email: user.email, role: user.role }}>
			<div className="flex min-h-0 flex-1 flex-col overflow-x-hidden p-6 sm:p-8">{children}</div>
		</SidebarShell>
	);
}
