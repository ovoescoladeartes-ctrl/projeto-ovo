"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buscarPessoas, type PapelPessoa, type PessoaBusca } from "@/core/pessoas/actions";
import { cn } from "@/lib/utils";

interface PessoaComboboxProps {
	value: string | null;
	onChange: (pessoa: PessoaBusca | null) => void;
	papel?: PapelPessoa;
	valorInicial?: PessoaBusca | null;
	placeholder?: string;
	disabled?: boolean;
}

export function PessoaCombobox({
	value,
	onChange,
	papel,
	valorInicial = null,
	placeholder = "Buscar pessoa...",
	disabled = false,
}: PessoaComboboxProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [termo, setTermo] = useState("");
	const [resultados, setResultados] = useState<PessoaBusca[]>([]);
	const [selecionada, setSelecionada] = useState<PessoaBusca | null>(valorInicial);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		setSelecionada(valorInicial);
	}, [valorInicial]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const timer = setTimeout(() => {
			startTransition(async () => {
				const pessoas = await buscarPessoas(termo, papel);
				setResultados(pessoas);
			});
		}, 200);
		return () => clearTimeout(timer);
	}, [termo, papel, open]);

	function handleSelect(pessoa: PessoaBusca): void {
		setSelecionada(pessoa);
		onChange(pessoa);
		setOpen(false);
	}

	return (
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
					<span className="truncate">{selecionada ? selecionada.nome : placeholder}</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
				<Command shouldFilter={false}>
					<CommandInput placeholder="Digite o nome..." value={termo} onValueChange={setTermo} />
					<CommandList>
						<CommandEmpty>{isPending ? "Buscando..." : "Nenhuma pessoa encontrada."}</CommandEmpty>
						<CommandGroup>
							{resultados.map((pessoa) => (
								<CommandItem key={pessoa.id} value={pessoa.id} onSelect={() => handleSelect(pessoa)}>
									<Check className={cn("mr-2 h-4 w-4", value === pessoa.id ? "opacity-100" : "opacity-0")} />
									{pessoa.nome}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
