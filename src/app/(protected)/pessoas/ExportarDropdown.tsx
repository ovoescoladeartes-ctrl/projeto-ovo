"use client";

import { Copy, FileDown, MessageCircle, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { buscarContatosParaExportar, type ContatoParaExportar } from "./actions";
import { baixarArquivo, digitosComPais, montarCsv, montarVCard } from "./exportarContatosFormato";

interface ExportarDropdownProps {
	pessoaIds: string[];
}

/**
 * Botão de exportar dentro do cabeçalho da tabela — sem seleção fica visível porém apagado (não
 * bloqueado de verdade: clicar só não tem o que exportar, os 5 itens ficam inativos no menu).
 * Cada ação faz uma busca só (`buscarContatosParaExportar`) e formata o resultado do jeito que
 * precisa no client.
 */
export function ExportarDropdown({ pessoaIds }: ExportarDropdownProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();
	const [whatsappOpen, setWhatsappOpen] = useState(false);
	const [contatosWhatsapp, setContatosWhatsapp] = useState<ContatoParaExportar[]>([]);
	const temSelecao = pessoaIds.length > 0;

	function executar(acao: (contatos: ContatoParaExportar[]) => void): void {
		if (!temSelecao) {
			return;
		}
		startTransition(async () => {
			const contatos = await buscarContatosParaExportar(pessoaIds);
			acao(contatos);
		});
	}

	function handleBaixarPlanilha(): void {
		executar((contatos) =>
			baixarArquivo(montarCsv(contatos), `contatos-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv"),
		);
	}

	function handleCopiarEmails(): void {
		executar((contatos) => {
			const emails = contatos.map((contato) => contato.email).filter((email): email is string => email !== null);
			void navigator.clipboard.writeText(emails.join(", "));
		});
	}

	function handleCopiarTelefones(): void {
		executar((contatos) => {
			const telefones = contatos
				.filter((contato) => contato.telefone !== null)
				.map((contato) => `+${digitosComPais(contato.telefone as string)}`);
			void navigator.clipboard.writeText(telefones.join(", "));
		});
	}

	function handleAbrirWhatsapp(): void {
		executar((contatos) => {
			setContatosWhatsapp(contatos.filter((contato) => contato.telefone !== null));
			setWhatsappOpen(true);
		});
	}

	function handleBaixarVcf(): void {
		executar((contatos) =>
			baixarArquivo(montarVCard(contatos), `contatos-${new Date().toISOString().slice(0, 10)}.vcf`, "text/vcard"),
		);
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						size="sm"
						variant={temSelecao ? "default" : "outline"}
						className={cn(
							"rounded-lg text-[13px] font-semibold normal-case",
							temSelecao ? "hover:!bg-primary/80" : "opacity-50 hover:!border-border-strong hover:!bg-subtle",
						)}
						disabled={isPending}
					>
						Exportar
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem disabled={!temSelecao} onClick={handleBaixarPlanilha} className="gap-2">
						<FileDown className="h-4 w-4" strokeWidth={2.4} />
						Baixar planilha completa
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!temSelecao} onClick={handleCopiarEmails} className="gap-2">
						<Copy className="h-4 w-4" strokeWidth={2.4} />
						Copiar e-mails
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!temSelecao} onClick={handleCopiarTelefones} className="gap-2">
						<Copy className="h-4 w-4" strokeWidth={2.4} />
						Copiar telefones
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!temSelecao} onClick={handleAbrirWhatsapp} className="gap-2">
						<MessageCircle className="h-4 w-4" strokeWidth={2.4} />
						Abrir conversas no WhatsApp
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!temSelecao} onClick={handleBaixarVcf} className="gap-2">
						<UserPlus className="h-4 w-4" strokeWidth={2.4} />
						Adicionar como contatos no celular
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Abrir conversas no WhatsApp</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						{contatosWhatsapp.map((contato) => (
							<a
								key={contato.id}
								href={`https://wa.me/${digitosComPais(contato.telefone as string)}`}
								target="_blank"
								rel="noreferrer"
								className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
							>
								{contato.nome}
							</a>
						))}
						{contatosWhatsapp.length === 0 ? (
							<p className="py-4 text-center text-sm text-muted-foreground">Ninguém selecionado tem telefone cadastrado.</p>
						) : null}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
