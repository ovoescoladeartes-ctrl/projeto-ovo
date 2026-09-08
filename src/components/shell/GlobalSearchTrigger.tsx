"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useGlobalSearch } from "./GlobalSearchProvider";

interface GlobalSearchTriggerProps {
	/** "input" (default): botão estilo campo de busca, usado em `PageHeader` (desktop). "icon": ícone só, usado em `MobileHeader`. */
	variant?: "input" | "icon";
	className?: string;
}

export function GlobalSearchTrigger({ variant = "input", className }: GlobalSearchTriggerProps): React.ReactElement {
	const { setOpen } = useGlobalSearch();

	if (variant === "icon") {
		return (
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className={cn("h-12 w-12 shrink-0", className)}
				aria-label="Buscar"
				onClick={() => setOpen(true)}
			>
				<Search className="!size-5" />
			</Button>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setOpen(true)}
			aria-label="Buscar"
			className={cn(
				"flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:border-foreground/20 hover:bg-card hover:text-foreground",
				className,
			)}
		>
			<Search className="h-4 w-4 shrink-0" />
			<span className="flex-1 truncate text-left">Buscar pessoas, turmas, vagões...</span>
			<kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
				⌘K
			</kbd>
		</button>
	);
}
