"use client";

import { useState } from "react";

import { ChecklistAcaoRow } from "@/components/checklist/ChecklistAcaoRow";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ordenarItensCard, type ItemOrdenavelCard } from "@/components/checklist/ordenarItensCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ChecklistResumo } from "@/core/checklist/schema";
import type { NivelPendencia } from "@/core/comunicacao/urgencia";

interface VagoesChecklistProps {
	resumo: ChecklistResumo;
	/** Vem de `contarAguardandoPorUrgencia` (`core/comunicacao/pendencias.ts`) — mesma seleção que o filtro `?urgencia=` de Vagões usa, pra o N da linha bater com o board depois do clique. */
	aguardando: Record<NivelPendencia, number>;
}

const ROTULO_NIVEL: Record<NivelPendencia, string> = { atencao: "atenção", urgente: "urgente" };

/** Ordem fixa das linhas de urgência — mais urgente primeiro. */
const NIVEIS_EM_ORDEM: readonly NivelPendencia[] = ["urgente", "atencao"];

/** Atalho pro formulário de "Novo contato" já existente em Vagões (`NovoContatoDialog`, aberto via `?novo=1`). */
const HREF_NOVO_CONTATO = "/vagoes?novo=1";

/**
 * Checklist do Dia — visão agregada, não lista de contatos (o board de Vagões já mostra cada
 * contato): uma linha de "Ações" por nível de urgência com pendência (N = 0 não aparece), levando
 * pro Vagões já filtrado, mais um atalho permanente pra cadastrar contatos. Só as linhas de
 * urgência contam no badge "X/Y pendentes": Y = os dois níveis, X = os que têm alguém esperando —
 * zero nos dois vira "Tudo em dia". O atalho nunca conta.
 */
export function VagoesChecklist({ resumo, aguardando }: VagoesChecklistProps): React.ReactElement {
	const [open, setOpen] = useState(false);

	const totalItens = NIVEIS_EM_ORDEM.length;
	const niveisComPendencia = NIVEIS_EM_ORDEM.filter((nivel) => aguardando[nivel] > 0);
	const itensPendentes = niveisComPendencia.length;

	const linhas = [
		...niveisComPendencia.map((nivel) => (
			<ChecklistAcaoRow key={nivel} titulo={`${aguardando[nivel]} aguardando resposta — ${ROTULO_NIVEL[nivel]}`} href={`/vagoes?urgencia=${nivel}`} />
		)),
		<ChecklistAcaoRow key="novo-contato" titulo="Cadastrar novos contatos" href={HREF_NOVO_CONTATO} />,
	];

	// Tudo é Ações sem atraso — o critério único mantém a ordem original (urgente, atenção, atalho).
	const itensCard: (ItemOrdenavelCard & { node: React.ReactElement })[] = linhas.map((node) => ({ atraso: 0, tipo: "acao" as const, node }));

	return (
		<>
			<ChecklistCard resumo={resumo} totalItens={totalItens} itensPendentes={itensPendentes} onAbrir={() => setOpen(true)}>
				{ordenarItensCard(itensCard).map((item) => item.node)}
			</ChecklistCard>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Checklist do Dia</SheetTitle>
					</SheetHeader>

					<section>
						<h3 className="mb-2 text-sm font-semibold text-foreground">Ações</h3>
						<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">{linhas}</div>
					</section>
				</SheetContent>
			</Sheet>
		</>
	);
}
