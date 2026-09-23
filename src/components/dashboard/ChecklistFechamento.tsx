"use client";

import { useState } from "react";

import { alternarItemFechamento } from "@/app/(protected)/caixa/fechamento/actions";
import { ChecklistAcaoRow } from "@/components/checklist/ChecklistAcaoRow";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { ordenarItensCard, type ItemOrdenavelCard } from "@/components/checklist/ordenarItensCard";
import { FechamentoTarefaDetalhe } from "@/components/dashboard/FechamentoTarefaDetalhe";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ChecklistResumo } from "@/core/checklist/schema";
import type { FechamentoConsolidado, FechamentoTarefaRecorrentePendente } from "@/core/financeiro/fechamento/schema";

interface ChecklistFechamentoProps {
	resumo: ChecklistResumo;
	fechamento: FechamentoConsolidado;
}

/** Estado do painel: lista completa, ou detalhe de um item agrupado (por `itemId`, nunca o objeto em si — assim o detalhe é sempre relido do `fechamento` mais recente, ver `tarefaDetalhe` abaixo). */
type VisaoSheet = { tipo: "lista" } | { tipo: "detalhe"; itemId: string };

/**
 * Regra única de tipo, chamada tanto pelo card quanto pelo painel — nenhum dos dois classifica por
 * conta própria (item 3 do ajuste de navegação do Sheet, que antes deixava "Exportar relatório
 * semanal" isolado por ser o único com `itemId` fixo tratado como "Ações"): item agrupado — tem
 * sub-itens, aqui as semanas pendentes de uma tarefa recorrente do Ritual — é sempre "Ação"
 * (chevron, sempre leva pra fora da lista: o detalhe do item, dentro do próprio Sheet). Toda tarefa
 * em `tarefasRecorrentesPendentes` já tem, por construção, pelo menos 1 semana pendente (só entra
 * na lista quem tem alguma) — o resultado aqui é sempre "acao", mas a função implementa a regra de
 * verdade (sub-itens → Ação) em vez de fixar o valor escondido num comentário.
 */
function classificarTarefaRecorrente(tarefa: FechamentoTarefaRecorrentePendente): "acao" | "conferencia" {
	return tarefa.semanas.length > 0 ? "acao" : "conferencia";
}

/**
 * Fechamento Mensal — card resumido no dashboard, lista completa (6 itens fixos + as tarefas
 * recorrentes do Ritual ainda pendentes em alguma semana do mês) num painel aberto sob demanda.
 * Tarefas recorrentes são agrupadas por tarefa, não repetidas por semana — card e painel mostram
 * uma linha só por tarefa (não por semana); clicar nela leva pro detalhe da tarefa, dentro do
 * próprio painel (`FechamentoTarefaDetalhe`), nunca expande inline em nenhum dos dois lugares.
 */
export function ChecklistFechamento({ resumo, fechamento }: ChecklistFechamentoProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [visao, setVisao] = useState<VisaoSheet>({ tipo: "lista" });

	// Badge conta linhas exibidas, não semanas: uma tarefa agrupada é 1 pendente até resolver todas
	// as semanas (aí ela some de `tarefasRecorrentesPendentes` e para de contar) — a magnitude em
	// semanas continua visível na linha cinza do item ("N semanas pendentes (...)").
	const totalItens = fechamento.linhas.length + fechamento.tarefasRecorrentesPendentes.length;
	const itensPendentes = fechamento.linhas.filter((linha) => !linha.concluido).length + fechamento.tarefasRecorrentesPendentes.length;

	// Relido do `fechamento` mais recente a cada render, nunca guardado à parte: se a pessoa resolve
	// a última semana pendente da tarefa em detalhe, ela some de `tarefasRecorrentesPendentes` no
	// próximo `router.refresh()`, `tarefaDetalhe` vira `undefined`, e a visão cai pra lista sozinha —
	// sem precisar de um efeito pra "detectar" a mudança.
	const tarefaDetalhe =
		visao.tipo === "detalhe" ? fechamento.tarefasRecorrentesPendentes.find((tarefa) => tarefa.itemId === visao.itemId) : undefined;
	const mostrarDetalhe = visao.tipo === "detalhe" && tarefaDetalhe !== undefined;

	function abrirLista(): void {
		setVisao({ tipo: "lista" });
		setOpen(true);
	}

	function abrirDetalhe(itemId: string): void {
		setVisao({ tipo: "detalhe", itemId });
		setOpen(true);
	}

	/** Linha de item agrupado — mesmo componente no card e na lista do Sheet, só o que "abrir" faz muda (abrir o painel vs. só trocar a visão, já que o painel já está aberto). */
	function renderTarefa(tarefa: FechamentoTarefaRecorrentePendente, onAbrir: () => void): React.ReactElement {
		return <ChecklistAcaoRow key={tarefa.itemId} titulo={tarefa.label} meta={tarefa.periodoLabel} explicacao={tarefa.explicacao} onAbrir={onAbrir} />;
	}

	function renderLinha(linha: FechamentoConsolidado["linhas"][number]): React.ReactElement {
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
	// separada por tipo dentro do card. Nenhum item aqui tem atraso próprio (não há herdado no
	// Fechamento), então a ordem final é só Ações primeiro, Conferência depois.
	const itensCard: (ItemOrdenavelCard & { key: string; node: React.ReactElement })[] = [
		...fechamento.tarefasRecorrentesPendentes.map((tarefa) => ({
			atraso: 0,
			tipo: classificarTarefaRecorrente(tarefa),
			key: tarefa.itemId,
			node: renderTarefa(tarefa, () => abrirDetalhe(tarefa.itemId)),
		})),
		...fechamento.linhas.map((linha) => ({ atraso: 0, tipo: "conferencia" as const, key: linha.id, node: renderLinha(linha) })),
	];

	return (
		<>
			<ChecklistCard resumo={resumo} totalItens={totalItens} itensPendentes={itensPendentes} onAbrir={abrirLista}>
				{totalItens > 0 ? ordenarItensCard(itensCard).map((item) => item.node) : undefined}
			</ChecklistCard>

			<Sheet
				open={open}
				onOpenChange={(proximo) => {
					setOpen(proximo);
					// X/clique fora fecha tudo — a próxima abertura sempre começa do jeito que foi pedida
					// (lista, via "Ver checklist completo", ou detalhe, via chevron de um item), nunca presa
					// numa visão antiga.
					if (!proximo) {
						setVisao({ tipo: "lista" });
					}
				}}
			>
				<SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-lg">
					{mostrarDetalhe && tarefaDetalhe !== undefined ? (
						<FechamentoTarefaDetalhe
							key={tarefaDetalhe.itemId}
							tarefa={tarefaDetalhe}
							tituloChecklist={`Fechamento Mensal — ${fechamento.periodoLabel}`}
							onVoltar={() => setVisao({ tipo: "lista" })}
						/>
					) : (
						<>
							<SheetHeader>
								<SheetTitle>Fechamento Mensal — {fechamento.periodoLabel}</SheetTitle>
							</SheetHeader>

							{/* Uma seção só por comportamento (regra 1 do ajuste de navegação do Sheet): "Ações" é
							todo item agrupado (chevron, leva pro detalhe — `classificarTarefaRecorrente`, nunca
							decidido aqui por qual tarefa é); "Conferência" é todo item avulso (checkbox). */}
							{fechamento.tarefasRecorrentesPendentes.length > 0 ? (
								<section>
									<h3 className="mb-2 text-sm font-semibold text-foreground">Ações</h3>
									<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
										{fechamento.tarefasRecorrentesPendentes.map((tarefa) =>
											renderTarefa(tarefa, () => setVisao({ tipo: "detalhe", itemId: tarefa.itemId })),
										)}
									</div>
								</section>
							) : null}

							<section>
								<h3 className="mb-2 text-sm font-semibold text-foreground">Conferência</h3>
								<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
									{fechamento.linhas.map(renderLinha)}
								</div>
							</section>
						</>
					)}
				</SheetContent>
			</Sheet>
		</>
	);
}
