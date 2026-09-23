"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseNivelPendencia, type NivelPendencia } from "@/core/comunicacao/urgencia";

const TODOS = "__todos__";

const OPCOES_URGENCIA: readonly { valor: NivelPendencia; label: string }[] = [
	{ valor: "atencao", label: "Urgência: atenção" },
	{ valor: "urgente", label: "Urgência: urgente" },
];

interface VagoesFiltroBarProps {
	opcoesInteresse: string[];
}

export function VagoesFiltroBar({ opcoesInteresse }: VagoesFiltroBarProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const interesse = searchParams.get("interesse") ?? TODOS;
	// Valor inválido na URL é ignorado — mostra "todas", igual ao board (que também ignora).
	const urgencia = parseNivelPendencia(searchParams.get("urgencia")) ?? TODOS;

	function atualizarFiltro(chave: "interesse" | "urgencia", valor: string): void {
		const params = new URLSearchParams(searchParams.toString());
		if (valor === TODOS) {
			params.delete(chave);
		} else {
			params.set(chave, valor);
		}
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	return (
		<>
			<Select value={interesse} onValueChange={(valor) => atualizarFiltro("interesse", valor)} disabled={opcoesInteresse.length === 0}>
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
			<Select value={urgencia} onValueChange={(valor) => atualizarFiltro("urgencia", valor)}>
				<SelectTrigger className="w-auto min-w-[10rem]">
					<SelectValue placeholder="Urgência: todas" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={TODOS}>Urgência: todas</SelectItem>
					{OPCOES_URGENCIA.map((opcao) => (
						<SelectItem key={opcao.valor} value={opcao.valor}>
							{opcao.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</>
	);
}
