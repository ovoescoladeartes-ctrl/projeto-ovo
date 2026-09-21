"use client";

import { ChevronLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { alternarItemRitual } from "@/app/(protected)/caixa/checklist/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SheetTitle } from "@/components/ui/sheet";
import type { FechamentoTarefaRecorrentePendente } from "@/core/financeiro/fechamento/schema";

/** Só "Exportar relatório semanal" tem uma ação de exportação — o resto marca como concluído. Como não existe hoje nenhuma geração real de relatório no projeto, "exportar" aqui resolve as semanas selecionadas da mesma forma que "marcar como resolvidas", só com rótulo/ícone que combinam com a tarefa. */
const ITEM_EXPORTAVEL = "exportar-relatorio";

interface FechamentoTarefaDetalheProps {
	tarefa: FechamentoTarefaRecorrentePendente;
	tituloChecklist: string;
	onVoltar: () => void;
}

/**
 * Estado "detalhe" do painel lateral do Fechamento — troca o conteúdo inteiro do Sheet (cabeçalho
 * incluso) quando a pessoa clica num item agrupado, no card ou na lista do Sheet. Substitui o
 * antigo accordion inline (`FechamentoTarefaRecorrente`, aposentado nesta rodada): a regra fechada
 * é que nenhum item expande dentro de uma lista — todo item de "Ações" leva pra fora dela, e pra
 * item agrupado isso quer dizer trocar a lista por este detalhe, não revelar linhas ali mesmo.
 *
 * Uma linha por semana pendente, texto à esquerda + `Checkbox` à direita (mesma anatomia do item
 * de "Conferência", mas com estado local — não é `ChecklistItemToggle`: aqui várias semanas são
 * selecionadas e resolvidas juntas com um botão só, não uma persistida por clique). Reaproveita a
 * mesma action (`alternarItemRitual`) e a mesma lógica de seleção do accordion antigo — só a
 * casca (onde/como aparece) mudou.
 */
export function FechamentoTarefaDetalhe({ tarefa, tituloChecklist, onVoltar }: FechamentoTarefaDetalheProps): React.ReactElement {
	const [selecionadas, setSelecionadas] = useState<ReadonlySet<string>>(new Set(tarefa.semanas.map((semana) => semana.semana)));
	const [isPending, startTransition] = useTransition();
	const [erro, setErro] = useState<string | null>(null);
	const router = useRouter();

	const exportavel = tarefa.itemId === ITEM_EXPORTAVEL;

	function alternarSelecao(semana: string, marcado: boolean): void {
		setSelecionadas((atual) => {
			const proximo = new Set(atual);
			if (marcado) {
				proximo.add(semana);
			} else {
				proximo.delete(semana);
			}
			return proximo;
		});
	}

	function handleConfirmar(): void {
		setErro(null);
		startTransition(async () => {
			const resultados = await Promise.all(
				[...selecionadas].map((semana) => alternarItemRitual({ semana, itemId: tarefa.itemId, concluido: true })),
			);
			const falha = resultados.find((resultado) => resultado.status === "error");
			if (falha !== undefined) {
				setErro(falha.message ?? "Não foi possível salvar. Tente novamente.");
				return;
			}
			// Depois de resolver, o pai busca `fechamento` de novo — se não sobrar semana pendente
			// pra essa tarefa, ele mesmo troca a visão de volta pra lista (deriva do dado, não daqui).
			router.refresh();
		});
	}

	return (
		<div className="flex flex-1 flex-col gap-6">
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="shrink-0"
						onClick={onVoltar}
						aria-label="Voltar pra lista do checklist"
					>
						<ChevronLeft className="h-5 w-5" />
					</Button>
					<SheetTitle className="text-sm font-medium text-muted-foreground">{tituloChecklist}</SheetTitle>
				</div>
				<div>
					<p className="text-base font-semibold text-foreground">{tarefa.label}</p>
					<p className="text-sm text-muted-foreground">{tarefa.periodoLabel}</p>
				</div>
			</div>

			<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
				{tarefa.semanas.map((semana) => (
					<label key={semana.semana} className="flex items-center gap-3 px-4 py-3 text-sm text-foreground">
						<span className="flex-1">{semana.label}</span>
						<Checkbox
							checked={selecionadas.has(semana.semana)}
							disabled={isPending}
							onCheckedChange={(checked) => alternarSelecao(semana.semana, checked === true)}
						/>
					</label>
				))}
			</div>

			{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}

			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-fit"
				disabled={isPending || selecionadas.size === 0}
				onClick={handleConfirmar}
			>
				{exportavel ? <Download className="h-4 w-4" /> : null}
				{isPending
					? "Salvando..."
					: exportavel
						? `Exportar selecionadas (${selecionadas.size})`
						: `Marcar como resolvidas (${selecionadas.size})`}
			</Button>
		</div>
	);
}
