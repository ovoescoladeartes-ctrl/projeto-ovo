"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ExportarConfirmacaoDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/**
	 * Elemento que abre o dialog ao ser clicado (vira `AlertDialogTrigger asChild`) — ex. um
	 * `DropdownMenuItem` (precisa de `onSelect={(e) => e.preventDefault()}` pra não fechar o menu
	 * antes do Radix processar a abertura, mesmo padrão de `PessoaExcluirMenuItem.tsx`). Omita
	 * quando o open/close já é 100% controlado de fora (ex. um `Button` comum com `onClick`).
	 */
	trigger?: React.ReactNode;
	/** O que vai ser exportado (ex.: "12 pessoas em uma planilha CSV.") — cada fluxo monta a frase. */
	descricao: React.ReactNode;
	onConfirmar: () => void;
	isPending: boolean;
}

/**
 * Confirmação genérica pra todo fluxo de exportar (download) do app — mostra o que vai ser
 * exportado antes de baixar, com "Download" primário e "Cancelar" secundário. Usado por
 * `ExportarDropdown` (Pessoas) e `ExportarTurmasButton` (Turmas); qualquer exportar novo reaproveita
 * este mesmo componente em vez de montar seu próprio dialog. Não cobre ações de copiar pra
 * clipboard (copiar e-mails/telefones) — essas não são download, continuam instantâneas.
 */
export function ExportarConfirmacaoDialog({
	open,
	onOpenChange,
	trigger,
	descricao,
	onConfirmar,
	isPending,
}: ExportarConfirmacaoDialogProps): React.ReactElement {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			{trigger !== undefined ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Baixar planilha</AlertDialogTitle>
					<AlertDialogDescription>{descricao}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<Button type="button" onClick={onConfirmar} disabled={isPending}>
						{isPending ? "Baixando..." : "Download"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
