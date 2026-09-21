"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { alternarItemChecklistComunicacao } from "@/app/(protected)/vagoes/checklist/actions";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { AdicionarItemChecklistDialog } from "@/components/dashboard/AdicionarItemChecklistDialog";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ChecklistResumo } from "@/core/checklist/schema";
import type { ChecklistComunicacaoDia } from "@/core/comunicacao/checklist/schema";

interface VagoesChecklistProps {
	resumo: ChecklistResumo;
	dia: string;
	checklist: ChecklistComunicacaoDia;
}

/**
 * Checklist do Dia — card resumido no dashboard, lista completa (pendências anteriores, blocos de
 * horário, itens avulsos) num painel aberto sob demanda. Itens de contato são derivados ao vivo da
 * lógica de pendência de comunicação já existente; itens manuais são avulsos, adicionados por
 * `AdicionarItemChecklistDialog`. O card mostra a lista inteira (item 4 do feedback de revisão),
 * não um recorte — a área já tem altura fixa com scroll interno: `pendenciasAnteriores` (mais
 * urgente, destaque) + `itensPendentesHoje` (já é "todo contato pendente hoje, agnóstico de bloco
 * de horário") + todos os manuais (inclusive os já concluídos, pra bater com o total do badge).
 */
export function VagoesChecklist({ resumo, dia, checklist }: VagoesChecklistProps): React.ReactElement {
	const manuaisPendentes = checklist.manuais.filter((item) => !item.concluido);
	const [open, setOpen] = useState(false);

	// `pendenciasAnteriores`/`itensPendentesHoje` já são listas "só pendente" (contato resolvido some
	// delas) — contam inteiras nos dois lados; só `manuais` tem itens concluídos que continuam na
	// lista, daí o filtro (item 2 do feedback de revisão: X/Y sempre calculado na hora do render).
	const totalItens = checklist.pendenciasAnteriores.length + checklist.itensPendentesHoje.length + checklist.manuais.length;
	const itensPendentes = checklist.pendenciasAnteriores.length + checklist.itensPendentesHoje.length + manuaisPendentes.length;

	const contatosCard = [
		...checklist.pendenciasAnteriores.map((item) => ({ ...item, destaque: true })),
		...checklist.itensPendentesHoje.map((item) => ({ ...item, destaque: false })),
	];

	return (
		<>
			<ChecklistCard resumo={resumo} totalItens={totalItens} itensPendentes={itensPendentes} onAbrir={() => setOpen(true)}>
				{totalItens > 0 ? (
					<>
						{contatosCard.map((item) => (
							<ChecklistItemToggle
								key={item.contatoId}
								label={item.nome}
								meta={`${item.canal} · aguardando há ${item.diasAguardando} dia${item.diasAguardando === 1 ? "" : "s"}`}
								concluido={item.concluido}
								avatarNome={item.nome}
								destaque={item.destaque}
								onToggle={(concluido) => alternarItemChecklistComunicacao({ dia, tipo: "contato", itemId: item.contatoId, concluido })}
							/>
						))}
						{checklist.manuais.map((item) => (
							<ChecklistItemToggle
								key={item.id}
								label={item.titulo}
								concluido={item.concluido}
								onToggle={(concluido) => alternarItemChecklistComunicacao({ dia, tipo: "manual", itemId: item.id, concluido })}
							/>
						))}
					</>
				) : undefined}
			</ChecklistCard>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Checklist do Dia</SheetTitle>
					</SheetHeader>

					{/* Comunicação não tem item com ação de negócio própria (botão de resolver/deep-link) —
					só a seção "Conferência" existe aqui (item 6 do feedback de revisão). A estrutura interna
					(pendências anteriores em destaque, blocos de horário, itens avulsos) continua igual. */}
					<h3 className="text-sm font-semibold text-foreground">Conferência</h3>

					{checklist.pendenciasAnteriores.length > 0 ? (
						<section className="overflow-hidden rounded-xl border border-red-200">
							<div className="flex items-center justify-between gap-2 border-b border-red-200 bg-red-50/50 px-4 py-3">
								<h3 className="text-sm font-semibold text-foreground">Pendências anteriores</h3>
								<span className="text-sm font-medium text-red-700">
									{checklist.pendenciasAnteriores.length}{" "}
									{checklist.pendenciasAnteriores.length === 1 ? "item não concluído" : "itens não concluídos"}
								</span>
							</div>
							<div className="divide-y divide-border">
								{checklist.pendenciasAnteriores.map((item) => (
									<ChecklistItemToggle
										key={item.contatoId}
										label={item.nome}
										meta={`${item.canal} · vencido há ${item.diasAguardando} dia${item.diasAguardando === 1 ? "" : "s"}`}
										concluido={item.concluido}
										avatarNome={item.nome}
										destaque
										onToggle={(concluido) =>
											alternarItemChecklistComunicacao({ dia, tipo: "contato", itemId: item.contatoId, concluido })
										}
									/>
								))}
							</div>
						</section>
					) : null}

					{checklist.blocos.map((bloco) => (
						<section key={bloco.id}>
							<h3 className="mb-2 text-sm font-medium text-muted-foreground">{bloco.label}</h3>
							{!bloco.disponivel ? (
								<div className="flex items-center justify-center rounded-lg bg-muted/50 py-6 text-sm text-muted-foreground">
									Disponível às {bloco.horaInicio}h
								</div>
							) : bloco.itens.length > 0 ? (
								<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
									{bloco.itens.map((item) => (
										<ChecklistItemToggle
											key={item.contatoId}
											label={item.nome}
											meta={`${item.canal} · aguardando há ${item.diasAguardando} dia${item.diasAguardando === 1 ? "" : "s"}`}
											concluido={item.concluido}
											avatarNome={item.nome}
											onToggle={(concluido) =>
												alternarItemChecklistComunicacao({ dia, tipo: "contato", itemId: item.contatoId, concluido })
											}
										/>
									))}
								</div>
							) : (
								<div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 py-6 text-sm text-muted-foreground">
									<CheckCircle2 className="h-4 w-4" />
									Nada pendente nesse horário
								</div>
							)}
						</section>
					))}

					<section>
						<div className="mb-2 flex items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<h3 className="text-sm font-semibold text-foreground">Outros itens</h3>
								<Badge variant={manuaisPendentes.length > 0 ? "secondary" : "outline"}>
									{manuaisPendentes.length > 0 ? `${manuaisPendentes.length}/${checklist.manuais.length} pendentes` : "Tudo em dia"}
								</Badge>
							</div>
							<AdicionarItemChecklistDialog dia={dia} />
						</div>
						{checklist.manuais.length > 0 ? (
							<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
								{checklist.manuais.map((item) => (
									<ChecklistItemToggle
										key={item.id}
										label={item.titulo}
										concluido={item.concluido}
										onToggle={(concluido) => alternarItemChecklistComunicacao({ dia, tipo: "manual", itemId: item.id, concluido })}
									/>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">Nenhum item avulso adicionado.</p>
						)}
					</section>
				</SheetContent>
			</Sheet>
		</>
	);
}
