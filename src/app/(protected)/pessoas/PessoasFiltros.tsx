"use client";

import { Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const TODOS = "__todos__";

interface PessoasFiltrosProps {
	opcoesInteresse: string[];
	opcoesTurma: string[];
}

const STATUS_OPCOES = [
	{ value: "lead", label: "Lead" },
	{ value: "matriculado", label: "Matriculado" },
	{ value: "ex_aluno", label: "Ex-aluno" },
];

const FILTRO_KEYS = ["aluno", "professor", "status", "interesse", "turma"] as const;

function contarFiltrosAtivos(searchParams: ReadonlyURLSearchParams): number {
	return FILTRO_KEYS.filter((chave) => searchParams.get(chave) !== null).length;
}

/**
 * Botão "Filtros" (mora no header da página, junto de Exportar/Nova pessoa) que abre um drawer
 * com Papel (Aluno/Professor) + Status/Interesse/Turma. A busca por nome não existe mais aqui —
 * quem resolve é a busca global do header. Dentro do drawer nada aplica sozinho: só ao clicar
 * "Aplicar", pra não disparar uma navegação a cada clique em Select/Checkbox.
 */
export function PessoasFiltros({ opcoesInteresse, opcoesTurma }: PessoasFiltrosProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [open, setOpen] = useState(false);

	const [draftAluno, setDraftAluno] = useState(searchParams.get("aluno") === "1");
	const [draftProfessor, setDraftProfessor] = useState(searchParams.get("professor") === "1");
	const [draftStatus, setDraftStatus] = useState(searchParams.get("status") ?? TODOS);
	const [draftInteresse, setDraftInteresse] = useState(searchParams.get("interesse") ?? TODOS);
	const [draftTurma, setDraftTurma] = useState(searchParams.get("turma") ?? TODOS);

	// Reabrir o drawer sempre parte do que está aplicado na URL agora — qualquer rascunho
	// deixado sem "Aplicar" numa visita anterior é descartado.
	function alternarDrawer(abrir: boolean): void {
		if (abrir) {
			setDraftAluno(searchParams.get("aluno") === "1");
			setDraftProfessor(searchParams.get("professor") === "1");
			setDraftStatus(searchParams.get("status") ?? TODOS);
			setDraftInteresse(searchParams.get("interesse") ?? TODOS);
			setDraftTurma(searchParams.get("turma") ?? TODOS);
		}
		setOpen(abrir);
	}

	function aplicar(): void {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("pagina");

		if (draftAluno) {
			params.set("aluno", "1");
		} else {
			params.delete("aluno");
		}
		if (draftProfessor) {
			params.set("professor", "1");
		} else {
			params.delete("professor");
		}
		if (draftStatus === TODOS) {
			params.delete("status");
		} else {
			params.set("status", draftStatus);
		}
		if (draftInteresse === TODOS) {
			params.delete("interesse");
		} else {
			params.set("interesse", draftInteresse);
		}
		if (draftTurma === TODOS) {
			params.delete("turma");
		} else {
			params.set("turma", draftTurma);
		}

		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
		setOpen(false);
	}

	function limparFiltros(): void {
		const params = new URLSearchParams(searchParams.toString());
		FILTRO_KEYS.forEach((chave) => params.delete(chave));
		params.delete("pagina");
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
		setOpen(false);
	}

	const filtrosAtivos = contarFiltrosAtivos(searchParams);

	return (
		<Sheet open={open} onOpenChange={alternarDrawer}>
			<SheetTrigger asChild>
				<Button type="button" variant="outline" className="shrink-0 gap-2" aria-label="Filtros">
					<Filter className="h-4 w-4" />
					<span className="hidden sm:inline">Filtros</span>
					{filtrosAtivos > 0 ? (
						<Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
							{filtrosAtivos}
						</Badge>
					) : null}
				</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Filtros</SheetTitle>
				</SheetHeader>

				<div className="mt-6 space-y-4">
					<div className="space-y-2">
						<Label>Papel</Label>
						<div className="flex items-center gap-2">
							<Checkbox
								id="filtro-aluno"
								checked={draftAluno}
								onCheckedChange={(checked) => setDraftAluno(checked === true)}
							/>
							<Label htmlFor="filtro-aluno" className="font-normal">
								Aluno
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="filtro-professor"
								checked={draftProfessor}
								onCheckedChange={(checked) => setDraftProfessor(checked === true)}
							/>
							<Label htmlFor="filtro-professor" className="font-normal">
								Professor
							</Label>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="filtro-status">Status</Label>
						<Select value={draftStatus} onValueChange={setDraftStatus}>
							<SelectTrigger id="filtro-status">
								<SelectValue placeholder="Status: todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={TODOS}>Status: todos</SelectItem>
								{STATUS_OPCOES.map((opcao) => (
									<SelectItem key={opcao.value} value={opcao.value}>
										{opcao.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="filtro-interesse">Interesse</Label>
						<Select value={draftInteresse} onValueChange={setDraftInteresse} disabled={opcoesInteresse.length === 0}>
							<SelectTrigger id="filtro-interesse">
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
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="filtro-turma">Turma</Label>
						<Select value={draftTurma} onValueChange={setDraftTurma} disabled={opcoesTurma.length === 0}>
							<SelectTrigger id="filtro-turma">
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
				</div>

				<SheetFooter className="mt-6 border-t border-border pt-4">
					<Button type="button" variant="ghost" onClick={limparFiltros} disabled={filtrosAtivos === 0}>
						Limpar filtros
					</Button>
					<Button type="button" onClick={aplicar}>
						Aplicar
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
