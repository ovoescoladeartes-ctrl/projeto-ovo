import { redirect } from "next/navigation";

import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { getServerSession } from "@/core/auth/getServerSession";

import { ImportarForm } from "./ImportarForm";

export default async function ImportarPessoasPage(): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Restrito a admin (não compartilha role set com o resto de Pessoas) — cada rota
	// protege a si mesma.
	if (session === null || session.role !== "admin") {
		redirect("/");
	}

	return (
		<div>
			<PageBreadcrumb
				items={[
					{ label: "Dashboard", href: "/" },
					{ label: "Pessoas", href: "/pessoas" },
					{ label: "Importar" },
				]}
			/>

			<h1 className="mb-6 mt-2 text-2xl font-bold text-foreground sm:text-3xl">Importar Pessoas (CSV)</h1>

			<ImportarForm />
		</div>
	);
}
