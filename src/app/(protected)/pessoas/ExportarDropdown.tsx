"use client";

import { Copy, FileDown } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ExportarConfirmacaoDialog } from "@/components/ExportarConfirmacaoDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { baixarArquivo } from "@/lib/csv";

import { buscarContatosParaExportar, type ContatoParaExportar } from "./actions";
import { digitosComPais, montarCsv } from "./exportarContatosFormato";

interface ExportarDropdownProps {
	/** IDs que batem com o filtro/busca atual da listagem — não uma seleção manual. */
	pessoaIds: string[];
}

/**
 * Botão secundário no header da página (ao lado de "Nova pessoa"), exporta todo `pessoaIds` — o
 * filtro/busca atual inteiro. Só fica apagado quando o filtro não bate com ninguém. Cada ação faz
 * uma busca só (`buscarContatosParaExportar`) e formata o resultado do jeito que precisa no client.
 * Só "Baixar planilha completa" passa por `ExportarConfirmacaoDialog` — é a única ação que baixa
 * um arquivo; copiar e-mails/telefones continuam instantâneos (não são download), mas avisam o
 * resultado num toast (sucesso, "ninguém tem esse dado" ou falha ao copiar) — sem isso, copiar pra
 * área de transferência não tem nenhum feedback visível.
 */
export function ExportarDropdown({ pessoaIds }: ExportarDropdownProps): React.ReactElement {
	const [confirmarAberto, setConfirmarAberto] = useState(false);
	const [isPending, startTransition] = useTransition();
	const podeExportar = pessoaIds.length > 0;

	function executar(acao: (contatos: ContatoParaExportar[]) => void): void {
		if (!podeExportar) {
			return;
		}
		startTransition(async () => {
			const contatos = await buscarContatosParaExportar(pessoaIds);
			acao(contatos);
		});
	}

	function handleBaixarPlanilha(): void {
		executar((contatos) => {
			baixarArquivo(montarCsv(contatos), `contatos-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
			setConfirmarAberto(false);
		});
	}

	/** Só avisa sucesso depois que o navegador confirma a escrita — clipboard pode ser bloqueado. */
	function copiarParaAreaDeTransferencia(texto: string, tituloSucesso: string, descricaoSucesso: string): void {
		navigator.clipboard.writeText(texto).then(
			() => toast.success(tituloSucesso, { description: descricaoSucesso }),
			() => toast.error("Não foi possível copiar", { description: "O navegador bloqueou o acesso à área de transferência." }),
		);
	}

	function handleCopiarEmails(): void {
		executar((contatos) => {
			const emails = contatos.map((contato) => contato.email).filter((email): email is string => email !== null);
			if (emails.length === 0) {
				toast.warning("Nenhum e-mail encontrado", { description: "Ninguém no filtro atual tem e-mail cadastrado." });
				return;
			}
			copiarParaAreaDeTransferencia(
				emails.join(", "),
				emails.length === 1 ? "E-mail copiado" : "E-mails copiados",
				`${emails.length} ${emails.length === 1 ? "endereço" : "endereços"} na área de transferência.`,
			);
		});
	}

	function handleCopiarTelefones(): void {
		executar((contatos) => {
			const telefones = contatos
				.filter((contato) => contato.telefone !== null)
				.map((contato) => `+${digitosComPais(contato.telefone as string)}`);
			if (telefones.length === 0) {
				toast.warning("Nenhum telefone encontrado", { description: "Ninguém no filtro atual tem telefone cadastrado." });
				return;
			}
			copiarParaAreaDeTransferencia(
				telefones.join(", "),
				telefones.length === 1 ? "Telefone copiado" : "Telefones copiados",
				`${telefones.length} ${telefones.length === 1 ? "número" : "números"} na área de transferência.`,
			);
		});
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline" disabled={!podeExportar || isPending}>
					Exportar
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<ExportarConfirmacaoDialog
					open={confirmarAberto}
					onOpenChange={setConfirmarAberto}
					trigger={
						<DropdownMenuItem onSelect={(event) => event.preventDefault()} className="gap-2">
							<FileDown className="h-4 w-4" strokeWidth={2.4} />
							Baixar planilha completa
						</DropdownMenuItem>
					}
					descricao={`Isso vai baixar uma planilha CSV com ${pessoaIds.length} ${pessoaIds.length === 1 ? "pessoa" : "pessoas"}.`}
					onConfirmar={handleBaixarPlanilha}
					isPending={isPending}
				/>
				<DropdownMenuItem onClick={handleCopiarEmails} className="gap-2">
					<Copy className="h-4 w-4" strokeWidth={2.4} />
					Copiar e-mails
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleCopiarTelefones} className="gap-2">
					<Copy className="h-4 w-4" strokeWidth={2.4} />
					Copiar telefones
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
