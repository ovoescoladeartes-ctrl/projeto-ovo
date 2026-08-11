"use client";

import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { upsertInteresse } from "@/core/interesses/actions";
import { cn } from "@/lib/utils";

interface InteresseTagsInputProps {
	value: string[];
	onChange: (value: string[]) => void;
	opcoes: string[];
	placeholder?: string;
	disabled?: boolean;
}

function normalizar(valor: string): string {
	return valor.trim().toLowerCase();
}

export function InteresseTagsInput({
	value,
	onChange,
	opcoes,
	placeholder = "Selecionar interesses...",
	disabled,
}: InteresseTagsInputProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [busca, setBusca] = useState("");
	const [opcoesLocais, setOpcoesLocais] = useState(opcoes);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		setOpcoesLocais(opcoes);
	}, [opcoes]);

	const buscaTrim = busca.trim();
	const existeExato = opcoesLocais.some((opcao) => normalizar(opcao) === normalizar(buscaTrim));

	function alternar(opcao: string): void {
		if (value.includes(opcao)) {
			onChange(value.filter((item) => item !== opcao));
		} else {
			onChange([...value, opcao]);
		}
	}

	function remover(opcao: string): void {
		onChange(value.filter((item) => item !== opcao));
	}

	function handleCriar(): void {
		setErro(null);
		const nome = buscaTrim;
		startTransition(async () => {
			const result = await upsertInteresse(nome);
			if (result.status === "error" || result.interesse === undefined) {
				setErro(result.message ?? "Não foi possível cadastrar.");
				return;
			}
			const nomeCriado = result.interesse.nome;
			setOpcoesLocais((prev) =>
				prev.some((item) => normalizar(item) === normalizar(nomeCriado))
					? prev
					: [...prev, nomeCriado].sort((a, b) => a.localeCompare(b, "pt-BR")),
			);
			if (!value.includes(nomeCriado)) {
				onChange([...value, nomeCriado]);
			}
			setBusca("");
		});
	}

	return (
		<div className="space-y-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={disabled}
						className="w-full justify-between font-normal"
					>
						<span className="truncate text-muted-foreground">{placeholder}</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
					<Command>
						<CommandInput placeholder="Buscar ou cadastrar assunto..." value={busca} onValueChange={setBusca} />
						<CommandList>
							{buscaTrim !== "" && !existeExato ? (
								<CommandGroup>
									<CommandItem key="criar-novo" value={`__criar__${buscaTrim}`} onSelect={handleCriar} disabled={isPending}>
										<Plus className="mr-2 h-4 w-4" />
										{isPending ? "Cadastrando..." : `Cadastrar novo interesse "${buscaTrim}"`}
									</CommandItem>
								</CommandGroup>
							) : null}
							<CommandEmpty>Nenhum assunto encontrado.</CommandEmpty>
							<CommandGroup>
								{opcoesLocais.map((opcao) => (
									<CommandItem key={opcao} value={opcao} onSelect={() => alternar(opcao)}>
										<Check className={cn("mr-2 h-4 w-4", value.includes(opcao) ? "opacity-100" : "opacity-0")} />
										{opcao}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
					{erro !== null ? <p className="border-t border-border px-3 py-2 text-xs text-destructive">{erro}</p> : null}
				</PopoverContent>
			</Popover>

			{value.length > 0 ? (
				<div className="flex flex-wrap gap-1.5">
					{value.map((item) => (
						<Badge key={item} variant="secondary" className="gap-1 pr-1">
							{item}
							<button
								type="button"
								onClick={() => remover(item)}
								disabled={disabled}
								className="rounded-full p-0.5 hover:bg-secondary-foreground/10"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
			) : null}
		</div>
	);
}
