import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChecklistResumo } from "@/core/checklist/schema";

import { ChecklistPinButton } from "./ChecklistPinButton";

interface ChecklistCardProps {
	resumo: ChecklistResumo;
	/**
	 * Total de itens e quantos ainda faltam — quem chama calcula os dois na hora de renderizar,
	 * direto do array de itens (`itens.length`/`itens.filter(i => !i.concluido).length`), nunca a
	 * partir de um valor guardado à parte (`resumo.totalPendentes` continua existindo só pro score
	 * de priorização, seção 6 da spec — não é mais a fonte do badge, ver item 2 do feedback de
	 * revisão: um valor calculado fora do render podia ficar preso ao estado antigo).
	 */
	totalItens: number;
	itensPendentes: number;
	onAbrir: () => void;
	/**
	 * Lista completa do checklist (não um recorte) — a área tem altura fixa com scroll interno, a
	 * pessoa rola pra ver tudo sem precisar abrir o painel (item 4 do feedback de revisão: o badge
	 * não pode contar item nenhum que não apareça em lugar nenhum dentro do card). Ausente/`undefined`
	 * mostra a descrição no lugar. Quem chama monta os grupos "Ações"/"Conferência" — cada um sua
	 * própria caixa com borda (`rounded-xl border`), empilhadas com `gap-3` entre si — o card não
	 * impõe nenhum wrapper por cima; sem rótulo de texto aqui (só no painel completo), a ordem
	 * (Ações primeiro) e as caixas separadas já comunicam o agrupamento.
	 */
	children?: React.ReactNode;
}

/** Formato "X/Y pendentes" (item 2 do feedback de revisão) — "Tudo em dia" quando não falta nada, "Sem itens" quando o checklist está genuinamente vazio (não confundir os dois, seção 7 da spec original). */
function rotuloContagem(totalItens: number, itensPendentes: number): string {
	if (totalItens === 0) {
		return "Sem itens";
	}
	if (itensPendentes === 0) {
		return "Tudo em dia";
	}
	return `${itensPendentes}/${totalItens} pendentes`;
}

/**
 * Cor do badge de contagem — âmbar quando há pendência, verde quando "tudo em dia", neutro quando
 * o checklist está genuinamente vazio (mesmas cores indicativas de estado da regra 18 do
 * design.md, `StatusBadge`/`*_CORES`: âmbar = aguardando/pendente, verde = estado positivo
 * concluído). Deliberadamente sem borda (`border-transparent`) — item 3 do feedback de revisão:
 * o badge precisa parecer claramente não clicável, diferente do botão "Ver checklist completo"
 * (`variant="outline"`, com borda de verdade).
 */
function corBadgeContagem(totalItens: number, itensPendentes: number): string {
	if (totalItens === 0) {
		return "border-transparent bg-secondary text-secondary-foreground";
	}
	if (itensPendentes > 0) {
		return "border-transparent bg-amber-100 text-amber-800";
	}
	return "border-transparent bg-emerald-100 text-emerald-800";
}

/**
 * Card compacto comum a todo `ChecklistResumo` (sistema ou customizado) — origem "materiais" não
 * passa por aqui, tem seu próprio card por turma (`spec-checklist-materiais.md`).
 */
export function ChecklistCard({ resumo, totalItens, itensPendentes, onAbrir, children }: ChecklistCardProps): React.ReactElement {
	return (
		<Card className="min-w-0">
			<CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
				{/* A tentativa anterior fixava uma altura no *wrapper* (tag + título) com overflow-hidden —
				só sobrava menos espaço pro título do que 2 linhas reais precisavam, cortando a segunda
				linha no meio (item 1 do feedback de revisão). Correção certa: `min-height` no próprio
				título, em `em` (relativo ao `line-height` dele, nunca px fixo) — `min-h-[2.6em]` com
				`leading-[1.3]` é exatamente 2 linhas nesse line-height, então título de 1 linha deixa
				espaço em branco embaixo e título de 2 linhas preenche sem cortar; `line-clamp-2` trunca
				com reticências limpo se passar disso. A tag fica fora dessa altura fixa — sua altura já é
				sempre a mesma (uma linha só), não precisa de reserva. */}
				<div className="flex flex-col gap-1">
					<Badge variant="outline" className="w-fit shrink-0 text-xs font-normal text-muted-foreground">
						{resumo.tema}
					</Badge>
					<CardTitle className="line-clamp-2 min-h-[2.6em] text-base leading-[1.3]">{resumo.titulo}</CardTitle>
				</div>
				<ChecklistPinButton id={resumo.id} origem={resumo.origem} pinado={resumo.pinado} />
			</CardHeader>
			<CardContent className="flex flex-col gap-3 pt-0">
				{/* `h-48` fixo (não `max-h-*`): um checklist com 1 item só não pode deixar o card mais baixo
				que um com muitos — a altura da área de lista/descrição é sempre a mesma, role internamente
				quando precisar. Mostra a lista completa, não um recorte (item 4 do feedback de revisão). */}
				<div className="h-48 overflow-y-auto">
					{children !== undefined ? (
						children
					) : (
						<p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">{resumo.descricao}</p>
					)}
				</div>
				<div className="flex items-center justify-between gap-2">
					<Badge className={corBadgeContagem(totalItens, itensPendentes)}>{rotuloContagem(totalItens, itensPendentes)}</Badge>
					<Button type="button" variant="outline" size="sm" onClick={onAbrir}>
						Ver checklist completo
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
