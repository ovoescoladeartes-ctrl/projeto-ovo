"use client";

import { ArrowUp, Mic, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CopilotoComposerProps {
	placeholder?: string;
	onSubmit: (texto: string) => void;
	className?: string;
}

export function CopilotoComposer({
	placeholder = "Pergunte algo sobre a escola...",
	onSubmit,
	className,
}: CopilotoComposerProps): React.ReactElement {
	const [valor, setValor] = useState("");

	function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		if (valor.trim() === "") {
			return;
		}
		onSubmit(valor);
		setValor("");
	}

	return (
		<form
			onSubmit={handleSubmit}
			className={cn(
				"flex items-center gap-2 rounded-2xl border border-input bg-background p-2 pl-3 shadow-sm",
				className
			)}
		>
			<Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full">
				<Plus className="h-4 w-4" />
				<span className="sr-only">Anexar</span>
			</Button>
			<Input
				value={valor}
				onChange={(event) => setValor(event.target.value)}
				placeholder={placeholder}
				className="h-9 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
			/>
			<Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full">
				<Mic className="h-4 w-4" />
				<span className="sr-only">Falar</span>
			</Button>
			<Button
				type="submit"
				size="icon"
				className="h-9 w-9 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90"
			>
				<ArrowUp className="h-4 w-4" />
				<span className="sr-only">Enviar</span>
			</Button>
		</form>
	);
}
