import { CheckCircle2 } from "lucide-react";

import { alternarItemChecklistComunicacao } from "@/app/(protected)/vagoes/checklist/actions";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { AdicionarItemChecklistDialog } from "@/components/dashboard/AdicionarItemChecklistDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChecklistComunicacaoDia } from "@/core/comunicacao/checklist/schema";

interface VagoesChecklistProps {
	dia: string;
	checklist: ChecklistComunicacaoDia;
}

/**
 * Checklist do Dia completo no Dashboard (era prévia de 2 itens + link pra `/vagoes/checklist`,
 * que não existe mais). Itens de contato são derivados ao vivo da lógica de pendência de
 * comunicação já existente; itens manuais são avulsos, adicionados por `AdicionarItemChecklistDialog`.
 */
export function VagoesChecklist({ dia, checklist }: VagoesChecklistProps): React.ReactElement {
	const manuaisPendentes = checklist.manuais.filter((item) => !item.concluido).length;
	const totalPendentes = checklist.pendenciasAnteriores.length + checklist.itensPendentesHoje.length + manuaisPendentes;

	return (
		<Card>
			<CardHeader className="flex-row items-center gap-2 space-y-0">
				<CardTitle className="text-base">Checklist do Dia</CardTitle>
				<Badge variant="secondary">{totalPendentes} pendentes</Badge>
			</CardHeader>
			<CardContent className="flex flex-col gap-6 pt-0">
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
							<Badge variant="secondary">
								{manuaisPendentes} de {checklist.manuais.length} pendentes
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
			</CardContent>
		</Card>
	);
}
