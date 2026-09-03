"use client";

import { useState } from "react";

import { alternarItemRitual } from "@/app/(protected)/caixa/checklist/actions";
import { ResolverPendenciaManualButton } from "@/app/(protected)/caixa/pendencias/ResolverPendenciaManualButton";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { NovaPendenciaManualDialog } from "@/components/dashboard/NovaPendenciaManualDialog";
import { PendenciaRow } from "@/components/dashboard/PendenciaRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PendenciaIcon } from "@/core/dashboard/types";
import type { PendenciaAcionavel } from "@/core/financeiro/pendencias/schema";
import type { RitualItemEstado, RitualPendenciaHerdada } from "@/core/financeiro/ritual/schema";

interface ChecklistFinanceiroProps {
	semana: string;
	passosRitual: RitualItemEstado[];
	pendenciasAcionaveis: PendenciaAcionavel[];
	pendenciasHerdadas: RitualPendenciaHerdada[];
}

/** Figma não mostra ícone nessas linhas — reaproveita a mesma semântica já usada pra pendências equivalentes em `core/dashboard/consultas.ts`. */
function iconeDaPendenciaAcionavel(tipo: "repasse" | "recebimento"): PendenciaIcon {
	return tipo === "repasse" ? "prazo" : "info";
}

/**
 * Checklist Financeiro do Dashboard — fusão do antigo "Ritual de Segunda" (5 itens fixos, sem
 * ligação com dado real) com "Pendências Acionáveis" (repasse a vencer, Pix pendente, manuais):
 * onde um passo do ritual duplicava uma pendência real, a pendência real tomou o lugar do toggle
 * manual (ver comentário em `core/financeiro/ritual/schema.ts`).
 *
 * O card em si só mostra um resumo — a lista completa é grande demais pro dashboard, então vive
 * num painel (`Sheet`) aberto sob demanda, sem navegar pra nenhuma URL própria.
 */
export function ChecklistFinanceiro({
	semana,
	passosRitual,
	pendenciasAcionaveis,
	pendenciasHerdadas,
}: ChecklistFinanceiroProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const passosPendentes = passosRitual.filter((item) => !item.concluido).length;
	const totalAberto = pendenciasAcionaveis.length + passosPendentes;

	return (
		<>
			<Card>
				<CardHeader className="flex-row items-center gap-2 space-y-0">
					<CardTitle className="text-base">Checklist Financeiro</CardTitle>
					<Badge variant={totalAberto > 0 ? "secondary" : "outline"}>
						{totalAberto > 0 ? `${totalAberto} pendente${totalAberto === 1 ? "" : "s"}` : "Tudo em dia"}
					</Badge>
				</CardHeader>
				<CardContent className="pt-0">
					<p className="mb-3 text-sm text-muted-foreground">
						Pendências reais (repasses, Pix, avulsas) e a rotina semanal de conferência.
					</p>
					<Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
						Ver checklist completo
					</Button>
				</CardContent>
			</Card>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Checklist Financeiro</SheetTitle>
					</SheetHeader>

					<section>
						<div className="mb-2 flex items-center justify-between gap-2">
							<h3 className="text-sm font-semibold text-foreground">Pendências</h3>
							<NovaPendenciaManualDialog />
						</div>
						{pendenciasAcionaveis.length > 0 ? (
							<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
								{pendenciasAcionaveis.map((pendencia) =>
									pendencia.tipo === "manual" && pendencia.pendenciaManualId !== null ? (
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
									),
								)}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">Nenhuma pendência acionável no momento.</p>
						)}
					</section>

					<section>
						<h3 className="mb-2 text-sm font-semibold text-foreground">Rotina da semana</h3>
						<div className="divide-y divide-border">
							{passosRitual.map((item) => (
								<ChecklistItemToggle
									key={item.id}
									label={item.label}
									concluido={item.concluido}
									onToggle={(concluido) => alternarItemRitual({ semana, itemId: item.id, concluido })}
								/>
							))}
						</div>
					</section>

					{pendenciasHerdadas.length > 0 ? (
						<section>
							<h3 className="mb-2 text-sm font-semibold text-foreground">Semanas anteriores não concluídas</h3>
							<div className="divide-y divide-border overflow-hidden rounded-xl border border-l-4 border-border border-l-foreground">
								{pendenciasHerdadas.map((pendencia) => (
									<PendenciaRow key={pendencia.id} icon={pendencia.icon} titulo={pendencia.titulo} meta={pendencia.meta} />
								))}
							</div>
						</section>
					) : null}
				</SheetContent>
			</Sheet>
		</>
	);
}
