"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

	const marcouAluno = searchParams.get("aluno") === "1";
	const marcouProfessor = searchParams.get("professor") === "1";
	const status = searchParams.get("status") ?? TODOS;
	const interesse = searchParams.get("interesse") ?? TODOS;
	const turma = searchParams.get("turma") ?? TODOS;

	function atualizarFiltro(chave: "status" | "interesse" | "turma", valor: string): void {
		const params = new URLSearchParams(searchParams.toString());
		if (valor === TODOS) {
			params.delete(chave);
		} else {
			params.set(chave, valor);
		}
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	function alternarPapel(chave: "aluno" | "professor", marcado: boolean): void {
		const params = new URLSearchParams(searchParams.toString());
		if (marcado) {
			params.set(chave, "1");
		} else {
			params.delete(chave);
		}
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	const statusOpcoes = [
		{ value: "lead", label: "Lead" },
		{ value: "matriculado", label: "Matriculado" },
	];

	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-1.5">
				<div className="flex items-center gap-2">
					<Checkbox
						id="filtro-papel-aluno"
						checked={marcouAluno}
						onCheckedChange={(checked) => alternarPapel("aluno", checked === true)}
					/>
					<Label htmlFor="filtro-papel-aluno" className="text-sm font-normal">
						Aluno
					</Label>
				</div>
				<div className="flex items-center gap-2">
					<Checkbox
						id="filtro-papel-professor"
						checked={marcouProfessor}
						onCheckedChange={(checked) => alternarPapel("professor", checked === true)}
					/>
					<Label htmlFor="filtro-papel-professor" className="text-sm font-normal">
						Professor
					</Label>
				</div>
			</div>

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
