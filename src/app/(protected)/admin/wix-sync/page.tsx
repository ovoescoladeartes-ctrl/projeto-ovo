import Link from "next/link";
import { redirect } from "next/navigation";

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
			<Link href="/pessoas" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
				← Voltar para Pessoas
			</Link>

			<div className="mt-3 mb-6">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Sincronizar com a Wix</h1>
				<p className="text-sm text-muted-foreground">
					Importa alunos que compraram (via Contacts), cursos do catálogo (Store Products) e pagamentos aprovados
					(Orders) do site da Ovo. Somente leitura — nada é escrito de volta na Wix. Confira a prévia antes de
					confirmar.
				</p>
			</div>

			<WixSyncPanel />
		</div>
	);
}
