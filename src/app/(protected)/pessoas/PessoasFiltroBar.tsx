"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Chip } from "@/components/ui/chip";

import { FiltrosAvancadosSheet } from "./FiltrosAvancadosSheet";

interface PessoasFiltroBarProps {
	opcoesInteresse: string[];
	opcoesTurma: string[];
}

/** Chips de Papel + gatilho do painel de Filtros avançados (Status/Interesse/Turma). Busca fica na linha de cima, junto dos botões de ação. */
export function PessoasFiltroBar({ opcoesInteresse, opcoesTurma }: PessoasFiltroBarProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const marcouAluno = searchParams.get("aluno") === "1";
	const marcouProfessor = searchParams.get("professor") === "1";

	function alternarPapel(chave: "aluno" | "professor", marcado: boolean): void {
		const params = new URLSearchParams(searchParams.toString());
		if (marcado) {
			params.set(chave, "1");
		} else {
			params.delete(chave);
		}
		params.delete("pagina");
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
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
