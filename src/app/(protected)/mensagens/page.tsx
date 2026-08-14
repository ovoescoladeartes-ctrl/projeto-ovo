import { redirect } from "next/navigation";

import { CopilotoInput } from "@/components/dashboard/CopilotoInput";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { Mensagem, MensagemCategoria } from "@/core/comunicacao/mensagens/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { MensagemEditDialog } from "./MensagemEditDialog";
import { MensagemInativarButton } from "./MensagemInativarButton";
import { NovaMensagemDialog } from "./NovaMensagemDialog";

const MENSAGENS_ROLES: readonly Role[] = ["admin", "comunicacao"];

const CATEGORIA_LABELS: Record<MensagemCategoria, string> = {
	duracao: "Duração",
	valor: "Valor",
	nivel: "Nível",
	faixa_etaria: "Faixa etária",
};

interface MensagemDoc {
	categoria: string;
	titulo: string;
	texto: string;
	ativo: boolean;
}

export default async function MensagensPage(): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !MENSAGENS_ROLES.includes(session.role)) {
		redirect("/");
	}

	const snapshot = await getFirebaseAdminFirestore().collection("mensagens").where("ativo", "==", true).get();

	const mensagens: Mensagem[] = snapshot.docs.map((doc) => {
		const data = doc.data() as MensagemDoc;
		return {
			id: doc.id,
			categoria: data.categoria as MensagemCategoria,
			titulo: data.titulo,
			texto: data.texto,
			ativo: data.ativo,
		};
	});

	mensagens.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));

	return (
		<div>
			<PageBreadcrumb
				items={[{ label: "Dashboard", href: "/" }, { label: "Configurações" }, { label: "Biblioteca de mensagens" }]}
			/>
			<div className="mb-6 mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Biblioteca de mensagens</h1>
				<CopilotoInput />
				<NovaMensagemDialog />
			</div>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Categoria</th>
							<th className="px-4 py-3 font-medium">Título</th>
							<th className="px-4 py-3 font-medium">Texto</th>
							<th className="px-4 py-3 font-medium" />
						</tr>
					</thead>
					<tbody>
						{mensagens.map((mensagem) => (
							<tr key={mensagem.id} className="border-b border-border last:border-0">
								<td className="px-4 py-3 text-muted-foreground">{CATEGORIA_LABELS[mensagem.categoria]}</td>
								<td className="px-4 py-3 text-foreground">{mensagem.titulo}</td>
								<td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{mensagem.texto}</td>
								<td className="px-4 py-3 text-right">
									<div className="flex justify-end gap-1">
										<MensagemEditDialog mensagem={mensagem} />
										<MensagemInativarButton id={mensagem.id} />
									</div>
								</td>
							</tr>
						))}
						{mensagens.length === 0 ? (
							<tr>
								<td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
									Nenhuma mensagem cadastrada ainda.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}
