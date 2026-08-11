"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TODOS = "__todos__";

interface PessoasFiltroBarProps {
	opcoesInteresse: string[];
	opcoesTurma: string[];
}

export function PessoasFiltroBar({ opcoesInteresse, opcoesTurma }: PessoasFiltroBarProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const tipo = searchParams.get("tipo") ?? TODOS;
	const status = searchParams.get("status") ?? TODOS;
	const interesse = searchParams.get("interesse") ?? TODOS;
	const turma = searchParams.get("turma") ?? TODOS;

	function atualizarFiltro(chave: "tipo" | "status" | "interesse" | "turma", valor: string): void {
		const params = new URLSearchParams(searchParams.toString());
		if (valor === TODOS) {
			params.delete(chave);
		} else {
			params.set(chave, valor);
		}
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	const statusOpcoes = [
		{ value: "lead", label: "Lead" },
		{ value: "matriculado", label: "Matriculado" },
	];

	return (
		<div className="flex flex-wrap gap-2">
			<Select value={tipo} onValueChange={(value) => atualizarFiltro("tipo", value)}>
				<SelectTrigger className="w-auto min-w-[9rem]">
					<SelectValue placeholder="Tipo: todos" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={TODOS}>Tipo: todos</SelectItem>
					<SelectItem value="aluno">Aluno</SelectItem>
					<SelectItem value="colaborador">Colaborador</SelectItem>
				</SelectContent>
			</Select>

			<Select value={status} onValueChange={(value) => atualizarFiltro("status", value)}>
				<SelectTrigger className="w-auto min-w-[9rem]">
					<SelectValue placeholder="Status: todos" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={TODOS}>Status: todos</SelectItem>
					{statusOpcoes.map((opcao) => (
						<SelectItem key={opcao.value} value={opcao.value}>
							{opcao.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select value={interesse} onValueChange={(value) => atualizarFiltro("interesse", value)} disabled={opcoesInteresse.length === 0}>
				<SelectTrigger className="w-auto min-w-[9rem]">
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

			<Select value={turma} onValueChange={(value) => atualizarFiltro("turma", value)} disabled={opcoesTurma.length === 0}>
				<SelectTrigger className="w-auto min-w-[9rem]">
					<SelectValue placeholder="Turma: todas" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={TODOS}>Turma: todas</SelectItem>
					{opcoesTurma.map((opcao) => (
						<SelectItem key={opcao} value={opcao}>
							{opcao}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
