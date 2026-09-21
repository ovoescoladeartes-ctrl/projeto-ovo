"use client";

import { CircleHelp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ChecklistToggleResult {
	status: "ok" | "error";
	message?: string;
}

interface ChecklistItemToggleProps {
	label: string;
	concluido: boolean;
	onToggle: (concluido: boolean) => Promise<ChecklistToggleResult>;
	meta?: string;
	/** Nome de onde derivar as iniciais do avatar (Figma: "Generic avatar") — só itens de contato têm. */
	avatarNome?: string;
	/** Estilo vermelho de pendência atrasada (Figma: frame "4 · Checklist (vermelho)"). */
	destaque?: boolean;
	/**
	 * Quando os dois estão presentes, mostra um botão navegável ao lado do checkbox (US-5 do
	 * `spec-checklist-motor.md`) — diferente do `PendenciaRow` antigo, que sempre mostrava "Ver"
	 * mesmo sem destino real. Sem `actionHref`, nenhum botão aparece (affordance honesta, seção
	 * 5.4/5.7 da spec).
	 */
	actionHref?: string;
	actionLabel?: string;
	/**
	 * Texto opcional de ajuda pra itens cujo nome sozinho não deixa claro o que fazer (ex.: "Revisar
	 * falhas de cobrança") — item 8 do feedback de revisão. Sem explicação, nenhum ícone aparece.
	 */
	explicacao?: string;
	/** Botão de excluir (ícone de lixeira, terciário) — só usado hoje por Materiais (item 4 do feedback de revisão: "excluir" faz parte das ações da seção). Sem essa prop, nenhum botão de excluir aparece. */
	onExcluir?: () => Promise<ChecklistToggleResult>;
}

function IconeAjuda({ explicacao }: { explicacao: string }): React.ReactElement {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						className="shrink-0 text-muted-foreground hover:text-foreground"
						aria-label="Ajuda sobre este item"
					>
						<CircleHelp className="h-3.5 w-3.5" />
					</button>
				</TooltipTrigger>
				<TooltipContent className="max-w-64">{explicacao}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function iniciaisDoNome(nome: string): string {
	const partes = nome.trim().split(/\s+/).filter(Boolean);
	if (partes.length === 0) {
		return "?";
	}
	const primeira = partes[0]?.[0] ?? "";
	const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
	return (primeira + ultima).toUpperCase();
}

/**
 * Checkbox otimista genérico — estado local + `useTransition` + revert em erro, chamando
 * `onToggle` (a server action de cada domínio já parcialmente aplicada pelo caller). Cobre
 * Ritual/Fechamento (financeiro) e Checklist do Dia/Materiais (comunicação): layout compacto por
 * padrão, ou "rico" (avatar/meta/destaque) quando alguma dessas props é passada.
 */
export function ChecklistItemToggle({
	label,
	concluido,
	onToggle,
	meta,
	avatarNome,
	destaque = false,
	actionHref,
	actionLabel,
	explicacao,
	onExcluir,
}: ChecklistItemToggleProps): React.ReactElement {
	const [marcado, setMarcado] = useState(concluido);
	const [isPending, startTransition] = useTransition();
	const [excluindo, startExclusao] = useTransition();
	const router = useRouter();

	function handleExcluir(): void {
		if (onExcluir === undefined) {
			return;
		}
		startExclusao(async () => {
			await onExcluir();
			router.refresh();
		});
	}

	const botaoExcluir =
		onExcluir !== undefined ? (
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
				disabled={excluindo}
				onClick={handleExcluir}
				aria-label="Excluir item"
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		) : null;

	function handleCheckedChange(checked: boolean | "indeterminate"): void {
		const proximo = checked === true;
		setMarcado(proximo);
		startTransition(async () => {
			const resultado = await onToggle(proximo);
			if (resultado.status === "error") {
				setMarcado(!proximo);
				return;
			}
			// A revalidação dentro da action já deveria bastar, mas contadores como o badge de
			// "N pendentes" do `ChecklistCard` (props de um Server Component mais acima na árvore, sem
			// nenhum estado local espelhando o valor) seguiam presos ao valor antigo em teste real —
			// forçar o refresh aqui garante que a página busque os dados atualizados de verdade.
			router.refresh();
		});
	}

	const rico = avatarNome !== undefined || meta !== undefined || destaque;
	const botaoAcao =
		actionHref !== undefined && actionLabel !== undefined ? (
			<Button type="button" variant="outline" size="sm" asChild className="shrink-0">
				<Link href={actionHref}>{actionLabel}</Link>
			</Button>
		) : null;

	if (!rico) {
		return (
			<div className="flex items-center gap-3 px-4 py-3">
				<Checkbox checked={marcado} disabled={isPending} onCheckedChange={handleCheckedChange} />
				<span className={cn("flex-1 text-sm", marcado ? "text-muted-foreground line-through" : "text-foreground")}>{label}</span>
				{explicacao !== undefined ? <IconeAjuda explicacao={explicacao} /> : null}
				{botaoAcao}
				{botaoExcluir}
			</div>
		);
	}

	return (
		<div className={cn("flex items-center gap-3 px-4 py-3", destaque && !marcado && "border-l-4 border-l-red-600")}>
			{avatarNome !== undefined ? (
				<Avatar className="h-9 w-9 shrink-0">
					<AvatarFallback className="text-xs font-medium">{iniciaisDoNome(avatarNome)}</AvatarFallback>
				</Avatar>
			) : null}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className={cn("text-sm font-medium", marcado ? "text-muted-foreground line-through" : destaque ? "text-red-700" : "text-foreground")}>
						{label}
					</p>
					{explicacao !== undefined ? <IconeAjuda explicacao={explicacao} /> : null}
				</div>
				{meta !== undefined ? (
					<p className={cn("text-xs", marcado ? "text-muted-foreground" : destaque ? "text-red-600" : "text-muted-foreground")}>{meta}</p>
				) : null}
			</div>
			{botaoAcao}
			<Checkbox checked={marcado} disabled={isPending} onCheckedChange={handleCheckedChange} className="shrink-0" />
			{botaoExcluir}
		</div>
	);
}
