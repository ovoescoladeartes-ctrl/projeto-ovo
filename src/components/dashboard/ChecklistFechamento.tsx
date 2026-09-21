"use client";

import { useState } from "react";

import { alternarItemFechamento } from "@/app/(protected)/caixa/fechamento/actions";
import { ChecklistAcaoRow } from "@/components/checklist/ChecklistAcaoRow";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { ordenarItensCard, type ItemOrdenavelCard } from "@/components/checklist/ordenarItensCard";
import { FechamentoTarefaRecorrente } from "@/components/dashboard/FechamentoTarefaRecorrente";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ChecklistResumo } from "@/core/checklist/schema";
import type { FechamentoConsolidado, FechamentoTarefaRecorrentePendente } from "@/core/financeiro/fechamento/schema";

interface ChecklistFechamentoProps {
	resumo: ChecklistResumo;
	fechamento: FechamentoConsolidado;
}

/** Só "Exportar relatório semanal" tem ação de exportação — vai pra "Ações"; o resto das tarefas recorrentes só marca como concluído — vai pra "Conferência" (item 2 da 7ª rodada de feedback: classificação já estabelecida, aplicada ao agrupamento como um todo). */
const ITEM_EXPORTAVEL = "exportar-relatorio";

/**
 * Fechamento Mensal — card resumido no dashboard, lista completa (6 itens fixos + as tarefas
 * recorrentes do Ritual ainda pendentes em alguma semana do mês) num painel aberto sob demanda.
 * Tarefas recorrentes são agrupadas por tarefa, não repetidas por semana (item 2 da 7ª rodada de
 * feedback) — expandem em accordion (`FechamentoTarefaRecorrente`), mas só dentro do painel
 * completo: o card compacto nunca expande nada ali dentro (regra de consistência do card — só
 * `chevron-right` estático, nunca a seta pra baixo do accordion), então lá o item acumulado é uma
 * linha `ChecklistAcaoRow` que só abre o painel, onde o accordion de verdade mora.
 */
export function ChecklistFechamento({ resumo, fechamento }: ChecklistFechamentoProps): React.ReactElement {
	const [open, setOpen] = useState(false);

	const totalItensTarefas = fechamento.tarefasRecorrentesPendentes.reduce((soma, tarefa) => soma + tarefa.semanas.length, 0);
	const totalItens = fechamento.linhas.length + totalItensTarefas;
	// Toda semana de tarefa recorrente mostrada aqui já é, por construção, pendente (só entra em
	// `tarefasRecorrentesPendentes` quem tem pelo menos 1 semana não concluída) — só os itens fixos
	// podem estar concluídos ou não.
	const itensPendentes = fechamento.linhas.filter((linha) => !linha.concluido).length + totalItensTarefas;

	const tarefasAcoes = fechamento.tarefasRecorrentesPendentes.filter((tarefa) => tarefa.itemId === ITEM_EXPORTAVEL);
	const tarefasConferencia = fechamento.tarefasRecorrentesPendentes.filter((tarefa) => tarefa.itemId !== ITEM_EXPORTAVEL);

	/** Linha do card compacto pro item acumulado — nunca expande ali, só abre o painel (onde vira `FechamentoTarefaRecorrente`, o accordion de verdade). */
	function renderTarefaCard(tarefa: FechamentoTarefaRecorrentePendente): React.ReactElement {
		return (
			<ChecklistAcaoRow key={tarefa.itemId} titulo={tarefa.label} meta={tarefa.periodoLabel} explicacao={tarefa.explicacao} onAbrir={() => setOpen(true)} />
		);
	}

	function renderLinhaCard(linha: FechamentoConsolidado["linhas"][number]): React.ReactElement {
		return (
			<ChecklistItemToggle
				key={linha.id}
				label={linha.label}
				concluido={linha.concluido}
				explicacao={linha.explicacao}
				onToggle={(concluido) => alternarItemFechamento({ periodo: fechamento.periodo, itemId: linha.id, concluido })}
			/>
		);
	}

	// Uma lista só, ordenada por atraso > Ações > ordem original (regra 38 do design.md) — sem caixa
	// separada por tipo dentro do card. Nenhum item aqui tem um "atraso" próprio (não há herdado no
	// Fechamento), então a ordem final é só Ações primeiro, Conferência depois.
	const itensCard: (ItemOrdenavelCard & { key: string; node: React.ReactElement })[] = [
		...tarefasAcoes.map((tarefa) => ({ atraso: 0, tipo: "acao" as const, key: tarefa.itemId, node: renderTarefaCard(tarefa) })),
		...tarefasConferencia.map((tarefa) => ({ atraso: 0, tipo: "conferencia" as const, key: tarefa.itemId, node: renderTarefaCard(tarefa) })),
		...fechamento.linhas.map((linha) => ({ atraso: 0, tipo: "conferencia" as const, key: linha.id, node: renderLinhaCard(linha) })),
	];

	return (
		<>
			<ChecklistCard resumo={resumo} totalItens={totalItens} itensPendentes={itensPendentes} onAbrir={() => setOpen(true)}>
				{totalItens > 0 ? ordenarItensCard(itensCard).map((item) => item.node) : undefined}
			</ChecklistCard>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Fechamento Mensal — {fechamento.periodoLabel}</SheetTitle>
					</SheetHeader>

					{/* Duas seções por comportamento (mesma regra de toda a spec): "Ações" só existe se
					"Exportar relatório semanal" tiver semana pendente — é a única tarefa com ação de
					negócio própria (exportar). O resto vai pra "Conferência". */}
					{tarefasAcoes.length > 0 ? (
						<section>
							<h3 className="mb-2 text-sm font-semibold text-foreground">Ações</h3>
							<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
								{tarefasAcoes.map((tarefa) => (
									<FechamentoTarefaRecorrente key={tarefa.itemId} tarefa={tarefa} />
								))}
							</div>
						</section>
					) : null}

					<section>
						<h3 className="mb-2 text-sm font-semibold text-foreground">Conferência</h3>
						<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
							{tarefasConferencia.map((tarefa) => (
								<FechamentoTarefaRecorrente key={tarefa.itemId} tarefa={tarefa} />
							))}
							{fechamento.linhas.map((linha) => (
								<ChecklistItemToggle
									key={linha.id}
									label={linha.label}
									concluido={linha.concluido}
									explicacao={linha.explicacao}
									onToggle={(concluido) => alternarItemFechamento({ periodo: fechamento.periodo, itemId: linha.id, concluido })}
								/>
							))}
						</div>
					</section>
				</SheetContent>
			</Sheet>
		</>
	);
}
