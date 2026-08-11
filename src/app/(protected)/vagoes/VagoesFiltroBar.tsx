"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TODOS = "__todos__";

interface VagoesFiltroBarProps {
	opcoesInteresse: string[];
}

export function VagoesFiltroBar({ opcoesInteresse }: VagoesFiltroBarProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const interesse = searchParams.get("interesse") ?? TODOS;

	function atualizarFiltro(valor: string): void {
		const params = new URLSearchParams(searchParams.toString());
		if (valor === TODOS) {
			params.delete("interesse");
		} else {
			params.set("interesse", valor);
		}
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	return (
		<Select value={interesse} onValueChange={atualizarFiltro} disabled={opcoesInteresse.length === 0}>
			<SelectTrigger className="w-auto min-w-[10rem]">
				<SelectValue placeholder="Interesse: todos" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={TODOS}>Interesse: todos</SelectItem>
				{opcoesInteresse.map((opcao) => (
					<SelectItem key={opcao} value={opcao}>
						{opcao}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
