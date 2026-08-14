"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { TurmasFiltrosAvancadosSheet } from "./TurmasFiltrosAvancadosSheet";

const TODOS = "__todos__";

interface TurmasFiltroBarProps {
	opcoesAssunto: string[];
}

function atualizarParam(searchParams: URLSearchParams, chave: string, valor: string): URLSearchParams {
	const params = new URLSearchParams(searchParams.toString());
	if (valor === "" || valor === TODOS) {
		params.delete(chave);
	} else {
		params.set(chave, valor);
	}
	return params;
}

/** Busca por nome + Tipo (filtros mais usados, sempre visíveis) + gatilho do painel de Filtros avançados. */
export function TurmasFiltroBar({ opcoesAssunto }: TurmasFiltroBarProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [busca, setBusca] = useState(searchParams.get("busca") ?? "");
	const tipo = searchParams.get("tipo") ?? TODOS;

	// Busca por nome navega com debounce — do contrário cada tecla digitada dispararia uma
	// navegação inteira (fetch novo no servidor, mesma causa de round-trip cara demais pra digitação).
	useEffect(() => {
		const atual = searchParams.get("busca") ?? "";
		if (busca === atual) {
			return;
		}
		const timeout = setTimeout(() => {
			const params = atualizarParam(searchParams, "busca", busca);
			const query = params.toString();
			router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
		}, 400);
		return () => clearTimeout(timeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [busca]);

	function mudarTipo(valor: string): void {
		const params = atualizarParam(searchParams, "tipo", valor);
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative w-full sm:max-w-xs">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Buscar por nome..."
					value={busca}
					onChange={(event) => setBusca(event.target.value)}
					className="pl-9"
				/>
			</div>
			<Select value={tipo} onValueChange={mudarTipo}>
				<SelectTrigger className="w-auto min-w-[9rem]">
					<SelectValue placeholder="Tipo: todos" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={TODOS}>Tipo: todos</SelectItem>
					<SelectItem value="curso">Curso</SelectItem>
					<SelectItem value="oficina">Oficina</SelectItem>
				</SelectContent>
			</Select>
			<TurmasFiltrosAvancadosSheet opcoesAssunto={opcoesAssunto} />
		</div>
	);
}
