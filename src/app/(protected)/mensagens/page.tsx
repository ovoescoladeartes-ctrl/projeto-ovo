import { MoreVertical } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { MensagemCategoria } from "@/core/comunicacao/mensagens/schema";
import { lerMensagensAtivas } from "@/core/db/mensagens";

import { MensagemEditDialog } from "./MensagemEditDialog";
import { MensagemInativarMenuItem } from "./MensagemInativarMenuItem";
import { NovaMensagemDialog } from "./NovaMensagemDialog";

const MENSAGENS_ROLES: readonly Role[] = ["admin", "comunicacao"];

const CATEGORIA_LABELS: Record<MensagemCategoria, string> = {
	duracao: "Duração",
	valor: "Valor",
	nivel: "Nível",
	faixa_etaria: "Faixa etária",
};

export default async function MensagensPage(): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !MENSAGENS_ROLES.includes(session.role)) {
		redirect("/");
	}

	const mensagensLidas = await lerMensagensAtivas();
	const mensagens = [...mensagensLidas].sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));

	const novaMensagemCta = <NovaMensagemDialog />;

	return (
		<div>
			<PageHeader
				breadcrumb={[{ label: "Dashboard", href: "/" }, { label: "Configurações" }, { label: "Biblioteca de mensagens" }]}
				title="Biblioteca de mensagens"
				cta={novaMensagemCta}
			/>

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
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button type="button" variant="ghost" size="icon" title="Mais ações" aria-label="Mais ações">
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<MensagemInativarMenuItem id={mensagem.id} />
											</DropdownMenuContent>
										</DropdownMenu>
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
