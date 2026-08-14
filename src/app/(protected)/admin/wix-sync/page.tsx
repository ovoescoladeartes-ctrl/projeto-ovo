import { redirect } from "next/navigation";

import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { getServerSession } from "@/core/auth/getServerSession";

import { WixSyncPanel } from "./WixSyncPanel";

export default async function WixSyncPage(): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Restrito a admin — escreve em massa em Pessoas, Turmas e Recebimentos ao mesmo
	// tempo, régua mais estrita que qualquer outra tela hoje. Cada rota protege a si mesma.
	if (session === null || session.role !== "admin") {
		redirect("/");
	}

	return (
		<div>
			<PageBreadcrumb
				items={[{ label: "Dashboard", href: "/" }, { label: "Configurações" }, { label: "Sincronizar com a Wix" }]}
			/>

			<h1 className="mb-6 mt-2 text-2xl font-bold text-foreground sm:text-3xl">Sincronizar com a Wix</h1>

			<WixSyncPanel />
		</div>
	);
}
