import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChecklistComunicacaoDia } from "@/core/comunicacao/checklist/schema";

import { RitualChecklistItem } from "./RitualChecklistItem";

/** Prévia do Dashboard mostra só os 2 primeiros itens pendentes (mesmo recorte de `RitualChecklist`, a prévia do Ritual financeiro) — a lista completa/interativa vive em `/vagoes/checklist`. */
const ITENS_NA_PREVIA = 2;

interface VagoesChecklistProps {
	checklist: ChecklistComunicacaoDia;
}

interface ItemPrevia {
	key: string;
	label: string;
	concluido: boolean;
}

export function VagoesChecklist({ checklist }: VagoesChecklistProps): React.ReactElement {
	const manuaisPendentes = checklist.manuais.filter((item) => !item.concluido);
	const totalPendentes = checklist.pendenciasAnteriores.length + checklist.itensPendentesHoje.length + manuaisPendentes.length;

	// Prioridade: pendências anteriores (mais urgente) → pendências de hoje → itens manuais — mesma
	// ordem usada pra contar o total acima, pra badge e prévia nunca discordarem sobre o que conta.
	const previa: ItemPrevia[] = [
		...checklist.pendenciasAnteriores.map((item) => ({ key: `contato-${item.contatoId}`, label: item.nome, concluido: item.concluido })),
		...checklist.itensPendentesHoje.map((item) => ({ key: `contato-${item.contatoId}`, label: item.nome, concluido: item.concluido })),
		...manuaisPendentes.map((item) => ({ key: `manual-${item.id}`, label: item.titulo, concluido: item.concluido })),
	].slice(0, ITENS_NA_PREVIA);

	return (
		<Card>
			<CardHeader className="flex-row items-center gap-2 space-y-0">
				<CardTitle className="text-base">Checklist do Dia</CardTitle>
				<Badge variant="secondary">{totalPendentes} pendentes</Badge>
			</CardHeader>
			<CardContent className="pt-0">
				{previa.length > 0 ? (
					previa.map((item) => <RitualChecklistItem key={item.key} label={item.label} concluido={item.concluido} />)
				) : (
					<p className="text-sm text-muted-foreground">Nada pendente por aqui ✓</p>
				)}
				<Link href="/vagoes/checklist" className="mt-3 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline">
					Ver checklist completo →
				</Link>
			</CardContent>
		</Card>
	);
}
