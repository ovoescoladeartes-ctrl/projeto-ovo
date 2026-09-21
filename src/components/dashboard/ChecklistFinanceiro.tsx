"use client";

import { useState } from "react";

import { alternarItemRitual } from "@/app/(protected)/caixa/checklist/actions";
import { ResolverPendenciaManualButton } from "@/app/(protected)/caixa/pendencias/ResolverPendenciaManualButton";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistItemToggle, type ChecklistToggleResult } from "@/components/checklist/ChecklistItemToggle";
import { NovaPendenciaManualDialog } from "@/components/dashboard/NovaPendenciaManualDialog";
import { PendenciaRow } from "@/components/dashboard/PendenciaRow";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ChecklistResumo } from "@/core/checklist/schema";
import type { PendenciaIcon } from "@/core/dashboard/types";
import type { PendenciaAcionavel } from "@/core/financeiro/pendencias/schema";
import type { RitualItemEstado, RitualPendenciaHerdada } from "@/core/financeiro/ritual/schema";

interface ChecklistFinanceiroProps {
	resumo: ChecklistResumo;
	semana: string;
	passosRitual: RitualItemEstado[];
	pendenciasAcionaveis: PendenciaAcionavel[];
	pendenciasHerdadas: RitualPendenciaHerdada[];
}

/** Figma não mostra ícone nessas linhas — reaproveita a mesma semântica já usada pra pendências equivalentes em `core/dashboard/consultas.ts`. */
function iconeDaPendenciaAcionavel(tipo: "repasse" | "recebimento"): PendenciaIcon {
	return tipo === "repasse" ? "prazo" : "info";
}

/** `semana`/`semanaAntiga` sempre "yyyy-MM-dd" com o dia fixo numa segunda (mesmo formato de `chaveSemana`/`semanaSchema`) — parse manual em vez de `new Date(string)` evita a semana escorregar por causa de fuso (`new Date("yyyy-MM-dd")` interpreta como UTC). */
function semanasAtras(semanaAtual: string, semanaAntiga: string): number {
	const parse = (valor: string) => new Date(Number(valor.slice(0, 4)), Number(valor.slice(5, 7)) - 1, Number(valor.slice(8, 10)));
	const diffMs = parse(semanaAtual).getTime() - parse(semanaAntiga).getTime();
	return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Checklist Financeiro do Dashboard — fusão do antigo "Ritual de Segunda" (5 itens fixos, sem
 * ligação com dado real) com "Pendências Acionáveis" (repasse a vencer, Pix pendente, manuais):
 * onde um passo do ritual duplicava uma pendência real, a pendência real tomou o lugar do toggle
 * manual (ver comentário em `core/financeiro/ritual/schema.ts`).
 *
 * O card em si só mostra um resumo — a lista completa é grande demais pro dashboard, então vive
 * num painel (`Sheet`) aberto sob demanda, sem navegar pra nenhuma URL própria. O preview dentro do
 * `ChecklistCard` mostra a lista inteira (Ações + Conferência, item 4 do feedback de revisão), não
 * um recorte — a área já tem altura fixa com scroll interno.
 */
export function ChecklistFinanceiro({
	resumo,
	semana,
	passosRitual,
	pendenciasAcionaveis,
	pendenciasHerdadas,
}: ChecklistFinanceiroProps): React.ReactElement {
	const [open, setOpen] = useState(false);

	/** Marcar o checkbox de um item herdado resolve todos os passos ainda pendentes daquela semana de uma vez — não há navegação especial, só "revisei isso". */
	async function resolverPendenciaHerdada(pendencia: RitualPendenciaHerdada): Promise<ChecklistToggleResult> {
		const resultados = await Promise.all(
			pendencia.itensPendentesIds.map((itemId) => alternarItemRitual({ semana: pendencia.semana, itemId, concluido: true })),
		);
		return resultados.find((resultado) => resultado.status === "error") ?? { status: "ok" };
	}

	function renderAcao(pendencia: PendenciaAcionavel): React.ReactElement {
		return pendencia.tipo === "manual" && pendencia.pendenciaManualId !== null ? (
			<div key={pendencia.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-foreground">{pendencia.titulo}</p>
					<p className="text-sm text-muted-foreground">{pendencia.meta}</p>
				</div>
				<ResolverPendenciaManualButton id={pendencia.pendenciaManualId} />
			</div>
		) : (
			<PendenciaRow
				key={pendencia.id}
				icon={iconeDaPendenciaAcionavel(pendencia.tipo as "repasse" | "recebimento")}
				titulo={pendencia.titulo}
				meta={pendencia.meta}
				href="/caixa"
				actionLabel="Resolver"
			/>
		);
	}

	function renderHerdado(pendencia: RitualPendenciaHerdada): React.ReactElement {
		return (
			<ChecklistItemToggle
				key={pendencia.id}
				label={pendencia.titulo}
				meta={`Herdado • há ${semanasAtras(semana, pendencia.semana)} semana${semanasAtras(semana, pendencia.semana) === 1 ? "" : "s"}`}
				concluido={false}
				destaque
				onToggle={() => resolverPendenciaHerdada(pendencia)}
			/>
		);
	}

	function renderRotina(item: RitualItemEstado): React.ReactElement {
		return (
			<ChecklistItemToggle
				key={item.id}
				label={item.label}
				concluido={item.concluido}
				explicacao={item.explicacao}
				onToggle={(concluido) => alternarItemRitual({ semana, itemId: item.id, concluido })}
			/>
		);
	}

	const totalItens = pendenciasAcionaveis.length + pendenciasHerdadas.length + passosRitual.length;
	const itensPendentes = pendenciasAcionaveis.length + pendenciasHerdadas.length + passosRitual.filter((item) => !item.concluido).length;

	return (
		<>
			<ChecklistCard resumo={resumo} totalItens={totalItens} itensPendentes={itensPendentes} onAbrir={() => setOpen(true)}>
				{totalItens > 0 ? (
					<>
						{pendenciasAcionaveis.map(renderAcao)}
						{pendenciasHerdadas.map(renderHerdado)}
						{passosRitual.map(renderRotina)}
					</>
				) : undefined}
			</ChecklistCard>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Checklist Financeiro</SheetTitle>
					</SheetHeader>

					{/* Duas seções por comportamento, não por categoria de negócio (item 6 do feedback de
					revisão): "Ações" é todo item com botão de ação de verdade (Resolver/Marcar como pago);
					"Conferência" é todo item que só precisa de checkbox. Uma seção some inteira (sem título)
					quando não tem conteúdo. */}
					{pendenciasAcionaveis.length > 0 ? (
						<section>
							<div className="mb-2 flex items-center justify-between gap-2">
								<h3 className="text-sm font-semibold text-foreground">Ações</h3>
								<NovaPendenciaManualDialog />
							</div>
							<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
								{pendenciasAcionaveis.map(renderAcao)}
							</div>
						</section>
					) : (
						<div className="flex justify-end">
							<NovaPendenciaManualDialog />
						</div>
					)}

					<section>
						<h3 className="mb-2 text-sm font-semibold text-foreground">Conferência</h3>
						<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
							{pendenciasHerdadas.map(renderHerdado)}
							{passosRitual.map(renderRotina)}
						</div>
					</section>
				</SheetContent>
			</Sheet>
		</>
	);
}
