"use client";

import { useState } from "react";

import { alternarItemRitual } from "@/app/(protected)/caixa/checklist/actions";
import { alternarItemFechamento } from "@/app/(protected)/caixa/fechamento/actions";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistItemToggle, type ChecklistToggleResult } from "@/components/checklist/ChecklistItemToggle";
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
 * feedback) — expandem em accordion no painel completo (`FechamentoTarefaRecorrente`). No card
 * compacto, cada tarefa agrupada vira uma linha só com checkbox que resolve todas as semanas
 * pendentes de uma vez (mesma simplificação já usada pros itens herdados do Ritual).
 */
export function ChecklistFechamento({ resumo, fechamento }: ChecklistFechamentoProps): React.ReactElement {
	const [open, setOpen] = useState(false);

	const totalItensTarefas = fechamento.tarefasRecorrentesPendentes.reduce((soma, tarefa) => soma + tarefa.semanas.length, 0);
	const totalItens = fechamento.linhas.length + totalItensTarefas;
	// Toda semana de tarefa recorrente mostrada aqui já é, por construção, pendente (só entra em
	// `tarefasRecorrentesPendentes` quem tem pelo menos 1 semana não concluída) — só os itens fixos
	// podem estar concluídos ou não.
	const itensPendentes = fechamento.linhas.filter((linha) => !linha.concluido).length + totalItensTarefas;

	/** Resolve todas as semanas pendentes de uma tarefa de uma vez — versão simplificada do accordion pro card compacto, mesmo espírito do "herdado" do Ritual (um checkbox só resolve tudo). */
	async function resolverTarefaRecorrente(tarefa: FechamentoTarefaRecorrentePendente): Promise<ChecklistToggleResult> {
		const resultados = await Promise.all(
			tarefa.semanas.map((semana) => alternarItemRitual({ semana: semana.semana, itemId: tarefa.itemId, concluido: true })),
		);
		return resultados.find((resultado) => resultado.status === "error") ?? { status: "ok" };
	}

	const tarefasAcoes = fechamento.tarefasRecorrentesPendentes.filter((tarefa) => tarefa.itemId === ITEM_EXPORTAVEL);
	const tarefasConferencia = fechamento.tarefasRecorrentesPendentes.filter((tarefa) => tarefa.itemId !== ITEM_EXPORTAVEL);

	return (
		<>
			<ChecklistCard resumo={resumo} totalItens={totalItens} itensPendentes={itensPendentes} onAbrir={() => setOpen(true)}>
				{totalItens > 0 ? (
					<>
						{fechamento.tarefasRecorrentesPendentes.map((tarefa) => (
							<ChecklistItemToggle
								key={tarefa.itemId}
								label={tarefa.label}
								meta={tarefa.periodoLabel}
								concluido={false}
								explicacao={tarefa.explicacao}
								onToggle={() => resolverTarefaRecorrente(tarefa)}
							/>
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
					</>
				) : undefined}
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
