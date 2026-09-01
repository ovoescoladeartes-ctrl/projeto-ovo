"use client";

import { useState, useTransition } from "react";

import { ExportarConfirmacaoDialog } from "@/components/ExportarConfirmacaoDialog";
import { Button } from "@/components/ui/button";
import { baixarArquivo } from "@/lib/csv";

import { buscarTurmasParaExportar } from "./actions";
import { montarCsvTurmas } from "./exportarTurmasFormato";

interface ExportarTurmasButtonProps {
	/** IDs que batem com o filtro/busca atual da listagem — não uma seleção manual. */
	turmaIds: string[];
}

/**
 * Botão secundário no header da página (ao lado de "Nova turma"), baixa CSV com todo `turmaIds`
 * — o filtro/busca atual inteiro, mesmo padrão de `ExportarDropdown` em Pessoas. Turma não tem
 * e-mail/telefone, então não sobra nenhuma outra ação coerente pra virar item de dropdown — é só
 * um botão direto, sem menu. Clicar abre `ExportarConfirmacaoDialog` antes de baixar de verdade.
 */
export function ExportarTurmasButton({ turmaIds }: ExportarTurmasButtonProps): React.ReactElement {
	const [confirmarAberto, setConfirmarAberto] = useState(false);
	const [isPending, startTransition] = useTransition();
	const podeExportar = turmaIds.length > 0;

	function handleConfirmar(): void {
		startTransition(async () => {
			const turmas = await buscarTurmasParaExportar(turmaIds);
			baixarArquivo(montarCsvTurmas(turmas), `turmas-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
			setConfirmarAberto(false);
		});
	}

	return (
		<>
			<Button type="button" variant="outline" onClick={() => setConfirmarAberto(true)} disabled={!podeExportar}>
				Exportar
			</Button>
			<ExportarConfirmacaoDialog
				open={confirmarAberto}
				onOpenChange={setConfirmarAberto}
				descricao={`Isso vai baixar uma planilha CSV com ${turmaIds.length} ${turmaIds.length === 1 ? "turma" : "turmas"}.`}
				onConfirmar={handleConfirmar}
				isPending={isPending}
			/>
		</>
	);
}
