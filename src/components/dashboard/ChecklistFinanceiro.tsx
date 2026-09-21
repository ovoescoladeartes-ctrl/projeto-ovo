"use client";

import { AlertCircle, AlertTriangle, Calendar, Clock, FileText, XCircle } from "lucide-react";
import { useState } from "react";

import { alternarItemRitual } from "@/app/(protected)/caixa/checklist/actions";
import { resolverPendenciaManual } from "@/app/(protected)/caixa/pendencias/actions";
import { ChecklistAcaoRow } from "@/components/checklist/ChecklistAcaoRow";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistItemToggle, type ChecklistToggleResult } from "@/components/checklist/ChecklistItemToggle";
import { NovaPendenciaManualDialog } from "@/components/dashboard/NovaPendenciaManualDialog";
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

/** Mesmo mapeamento semântico ícone-chave → componente que `PendenciaRow` (aposentado) tinha — `ChecklistAcaoRow` só aceita o componente. */
const ICONS: Record<PendenciaIcon, React.ComponentType<{ className?: string }>> = {
	erro: XCircle,
	aviso: AlertTriangle,
	info: AlertCircle,
	prazo: Clock,
	documento: FileText,
	calendario: Calendar,
};

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

	/**
	 * Card e painel têm comportamentos diferentes pro mesmo item de "Ações" sem página externa
	 * (pendência manual, ex.: "Marcar como pago"): dentro do card compacto, clicar sempre tira a
	 * pessoa do card — não existe página filtrada pra pendência manual, então o clique abre o painel
	 * lateral em vez de executar a ação ali mesmo. Dentro do painel (já é "fora do card"), o clique
	 * continua executando a ação na hora, como antes. Pendência com página real (repasse/recebimento
	 * → `/caixa`) navega igual nos dois lugares, já que "sair do card" e "navegar" são a mesma coisa.
	 */
	function renderAcao(pendencia: PendenciaAcionavel, contexto: "card" | "sheet"): React.ReactElement {
		if (pendencia.tipo === "manual" && pendencia.pendenciaManualId !== null) {
			const pendenciaManualId = pendencia.pendenciaManualId;
			return contexto === "card" ? (
				<ChecklistAcaoRow key={pendencia.id} titulo={pendencia.titulo} meta={pendencia.meta} onAbrir={() => setOpen(true)} />
			) : (
				<ChecklistAcaoRow
					key={pendencia.id}
					titulo={pendencia.titulo}
					meta={pendencia.meta}
					onExecutar={() => resolverPendenciaManual({ id: pendenciaManualId })}
				/>
			);
		}
		return (
			<ChecklistAcaoRow
				key={pendencia.id}
				icon={ICONS[iconeDaPendenciaAcionavel(pendencia.tipo as "repasse" | "recebimento")]}
				titulo={pendencia.titulo}
				meta={pendencia.meta}
				href="/caixa"
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
					<div className="flex flex-col gap-3">
						{/* Mesma separação por comportamento do painel completo (Ações primeiro, Conferência
						depois) — sem o rótulo de texto aqui (pouco espaço no card): a ordem + cada grupo na sua
						própria caixa com borda já comunicam o agrupamento (item 2 do pedido de ajuste visual). */}
						{pendenciasAcionaveis.length > 0 ? (
							<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
								{pendenciasAcionaveis.map((pendencia) => renderAcao(pendencia, "card"))}
							</div>
						) : null}
						{pendenciasHerdadas.length > 0 || passosRitual.length > 0 ? (
							<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
								{pendenciasHerdadas.map(renderHerdado)}
								{passosRitual.map(renderRotina)}
							</div>
						) : null}
					</div>
				) : undefined}
			</ChecklistCard>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Checklist Financeiro</SheetTitle>
					</SheetHeader>

					{/* Duas seções por comportamento, não por categoria de negócio (item 6 do feedback de
					revisão): "Ações" é todo item que executa/navega ao clicar na linha (`ChecklistAcaoRow`,
					chevron à direita); "Conferência" é todo item que só precisa de checkbox. Uma seção some
					inteira (sem título) quando não tem conteúdo. */}
					{pendenciasAcionaveis.length > 0 ? (
						<section>
							<div className="mb-2 flex items-center justify-between gap-2">
								<h3 className="text-sm font-semibold text-foreground">Ações</h3>
								<NovaPendenciaManualDialog />
							</div>
							<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
								{pendenciasAcionaveis.map((pendencia) => renderAcao(pendencia, "sheet"))}
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
