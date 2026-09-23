"use client";

import { CircleHelp, Trash2 } from "lucide-react";
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
	 * Texto opcional de ajuda pra itens cujo nome sozinho não deixa claro o que fazer (ex.: "Revisar
	 * falhas de cobrança") — item 8 do feedback de revisão. Sem explicação, nenhum ícone aparece.
	 */
	explicacao?: string;
	/** Botão de excluir (ícone de lixeira, terciário) — só usado hoje por Materiais (item 4 do feedback de revisão: "excluir" faz parte das ações da seção). Sem essa prop, nenhum botão de excluir aparece. */
	onExcluir?: () => Promise<ChecklistToggleResult>;
}

/**
 * Exportado pra `ChecklistAcaoRow` reaproveitar — mesmo ícone de ajuda em item de "Ações" e de "Conferência".
 *
 * Mora dentro de uma linha inteira clicável (`ChecklistAcaoRow`: `div role="button"` ou `Link`), então
 * nenhum evento dele pode chegar na linha: `stopPropagation` barra o `onClick`/`onKeyDown` da linha e
 * `preventDefault` barra a navegação nativa do `<a>` (o `Link` também respeita `defaultPrevented`).
 * O `preventDefault` também pula os handlers do próprio Radix (compostos depois dos nossos), que
 * fechariam o tooltip no pointerdown/clique — aqui o clique/toque *abre* (no toque não existe hover);
 * fecha ao tocar fora ou tirar o mouse.
 */
export function IconeAjuda({ explicacao }: { explicacao: string }): React.ReactElement {
	const [aberto, setAberto] = useState(false);

	return (
		<TooltipProvider>
			<Tooltip open={aberto} onOpenChange={setAberto}>
				<TooltipTrigger asChild>
					<button
						type="button"
						className="shrink-0 text-muted-foreground hover:text-foreground"
						aria-label="Ajuda sobre este item"
						onPointerDown={(event) => {
							event.stopPropagation();
							event.preventDefault();
						}}
						onClick={(event) => {
							event.stopPropagation();
							event.preventDefault();
							setAberto(true);
						}}
						onKeyDown={(event) => {
							// Enter/Espaço continuam ativando este botão (vira `onClick` acima) — só não sobem pra linha.
							event.stopPropagation();
						}}
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
 * Ritual/Fechamento (financeiro) e Checklist do Dia/Materiais (comunicação) — sempre item de
 * "Conferência" (checkbox); item de "Ações" (chevron, linha inteira clicável) usa
 * `ChecklistAcaoRow`, nunca este componente. Layout único — texto à esquerda, checkbox à direita
 * (avatar/meta/destaque são opcionais, sempre dentro dessa mesma estrutura); antes disso, um item
 * sem avatar/meta/destaque mostrava o checkbox à esquerda, um layout espelhado que parecia
 * inconsistência dentro da mesma lista.
 */
export function ChecklistItemToggle({
	label,
	concluido,
	onToggle,
	meta,
	avatarNome,
	destaque = false,
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
			<Checkbox checked={marcado} disabled={isPending} onCheckedChange={handleCheckedChange} className="shrink-0" />
			{botaoExcluir}
		</div>
	);
}
