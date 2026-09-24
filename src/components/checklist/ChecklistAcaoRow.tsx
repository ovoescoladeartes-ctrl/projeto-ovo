"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

import { IconeAjuda } from "./ChecklistItemToggle";

export interface ChecklistAcaoResult {
	status: "ok" | "error";
	message?: string;
}

interface ChecklistAcaoRowProps {
	titulo: string;
	meta?: string;
	explicacao?: string;
	/** Ícone opcional à esquerda (ex.: tipo de pendência — prazo, aviso, info). Sem ele, a linha só tem texto + seta. */
	icon?: React.ComponentType<{ className?: string }>;
	/**
	 * Exatamente um dos três: `href` navega (`Link`, pra uma página já filtrada); `onExecutar` roda a
	 * ação na hora (server action) e dá refresh ao terminar; `onAbrir` é síncrono e não executa
	 * nada — usado pra abrir o painel lateral do próprio checklist quando não existe página externa
	 * pra aquele item (regra do card compacto: todo clique tira a pessoa do card, nunca executa
	 * nem expande ali dentro). Item de "Ações", sem exceção, mostra só a seta `chevron-right` à
	 * direita — nunca um botão com texto, nunca outro ícone — e a linha inteira é clicável.
	 */
	href?: string;
	onExecutar?: () => Promise<ChecklistAcaoResult>;
	onAbrir?: () => void;
}

/** Linha de item de "Ações" — texto à esquerda, `chevron-right` à direita, linha inteira clicável (navega, executa, ou abre o painel). */
export function ChecklistAcaoRow({ titulo, meta, explicacao, icon: Icon, href, onExecutar, onAbrir }: ChecklistAcaoRowProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	function handleClick(): void {
		if (onAbrir !== undefined) {
			onAbrir();
			return;
		}
		if (onExecutar === undefined) {
			return;
		}
		startTransition(async () => {
			await onExecutar();
			router.refresh();
		});
	}

	const conteudo = (
		<div className="flex min-w-0 flex-1 items-center gap-3">
			{Icon !== undefined ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					{/* Até 2 linhas, nunca `truncate` de uma linha só — no card compacto (coluna estreita) cortava
					o fim do título, que é justamente o dado mais importante (ex.: "— urgente"). */}
					<p className="line-clamp-2 min-w-0 break-words text-sm font-medium text-foreground">{titulo}</p>
					{explicacao !== undefined ? <IconeAjuda explicacao={explicacao} /> : null}
				</div>
				{meta !== undefined ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
			</div>
		</div>
	);

	const classesLinha = cn(
		"flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
		isPending && "pointer-events-none opacity-60",
	);

	if (href !== undefined) {
		return (
			<Link href={href} className={classesLinha}>
				{conteudo}
				<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
			</Link>
		);
	}

	// `div role="button"`, não `<button>`: a linha pode conter o `IconeAjuda`, que é um `<button>` de
	// verdade — `<button>` dentro de `<button>` é HTML inválido (erro de hidratação no React). Mesmo
	// padrão de `ContatoCard` (Vagões): Enter/Espaço ativam como num botão nativo; tecla vinda de um
	// filho focado (o próprio ícone de ajuda) é ignorada.
	return (
		<div
			role="button"
			tabIndex={isPending ? -1 : 0}
			aria-disabled={isPending}
			className={classesLinha}
			onClick={handleClick}
			onKeyDown={(event) => {
				if (isPending || event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) {
					return;
				}
				event.preventDefault();
				handleClick();
			}}
		>
			{conteudo}
			<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
		</div>
	);
}
