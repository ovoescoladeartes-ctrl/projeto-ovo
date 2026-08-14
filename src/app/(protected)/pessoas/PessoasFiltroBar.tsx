"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";

import { FiltrosAvancadosSheet } from "./FiltrosAvancadosSheet";

interface PessoasFiltroBarProps {
	opcoesInteresse: string[];
	opcoesTurma: string[];
}

function atualizarParam(searchParams: URLSearchParams, chave: string, valor: string): URLSearchParams {
	const params = new URLSearchParams(searchParams.toString());
	if (valor === "") {
		params.delete(chave);
	} else {
		params.set(chave, valor);
	}
	params.delete("pagina");
	return params;
}

/** Busca por nome + Chips de Papel + gatilho do painel de Filtros avançados (Status/Interesse/Turma) — mesmo padrão de `TurmasFiltroBar.tsx`. */
export function PessoasFiltroBar({ opcoesInteresse, opcoesTurma }: PessoasFiltroBarProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [busca, setBusca] = useState(searchParams.get("busca") ?? "");
	const marcouAluno = searchParams.get("aluno") === "1";
	const marcouProfessor = searchParams.get("professor") === "1";

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

	function alternarPapel(chave: "aluno" | "professor", marcado: boolean): void {
		const params = atualizarParam(searchParams, chave, marcado ? "1" : "");
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
			<Chip className="h-[30px] text-[13px]" pressed={marcouAluno} onClick={() => alternarPapel("aluno", !marcouAluno)}>
				Aluno
			</Chip>
			<Chip
				className="h-[30px] text-[13px]"
				pressed={marcouProfessor}
				onClick={() => alternarPapel("professor", !marcouProfessor)}
			>
				Professor
			</Chip>
			<FiltrosAvancadosSheet opcoesInteresse={opcoesInteresse} opcoesTurma={opcoesTurma} />
		</div>
	);
}
