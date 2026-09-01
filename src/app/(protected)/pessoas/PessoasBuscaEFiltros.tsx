"use client";

import { Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const TODOS = "__todos__";

interface PessoasBuscaEFiltrosProps {
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
 * Busca por nome (sempre visível, aplica sozinha com debounce) + botão único "Filtros" que abre
 * um drawer com Papel (Aluno/Professor) + Status/Interesse/Turma (antigo "Filtros avançados") —
 * junta o que antes eram `PessoasFiltroBar` + `FiltrosAvancadosSheet` num só componente, centrado
 * no header (regra 15 do design.md). Dentro do drawer nada aplica sozinho: só ao clicar
 * "Aplicar", pra não disparar uma navegação a cada clique em Select/Checkbox.
 */
export function PessoasBuscaEFiltros({ opcoesInteresse, opcoesTurma }: PessoasBuscaEFiltrosProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [open, setOpen] = useState(false);

	const [busca, setBusca] = useState(searchParams.get("busca") ?? "");

	const [draftAluno, setDraftAluno] = useState(searchParams.get("aluno") === "1");
	const [draftProfessor, setDraftProfessor] = useState(searchParams.get("professor") === "1");
	const [draftStatus, setDraftStatus] = useState(searchParams.get("status") ?? TODOS);
	const [draftInteresse, setDraftInteresse] = useState(searchParams.get("interesse") ?? TODOS);
	const [draftTurma, setDraftTurma] = useState(searchParams.get("turma") ?? TODOS);

	// Busca por nome navega com debounce — do contrário cada tecla digitada dispararia uma
	// navegação inteira (fetch novo no servidor, mesma causa de round-trip cara demais pra digitação).
	useEffect(() => {
		const atual = searchParams.get("busca") ?? "";
		if (busca === atual) {
			return;
		}
		const timeout = setTimeout(() => {
			const params = new URLSearchParams(searchParams.toString());
			if (busca === "") {
				params.delete("busca");
			} else {
				params.set("busca", busca);
			}
			params.delete("pagina");
			const query = params.toString();
			router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
		}, 400);
		return () => clearTimeout(timeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [busca]);

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
		<div className="flex flex-wrap items-center justify-center gap-2">
			<div className="relative min-w-0 flex-1 sm:w-80 sm:flex-none">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Buscar por nome..."
					value={busca}
					onChange={(event) => setBusca(event.target.value)}
					className="pl-9"
				/>
			</div>

			<Sheet open={open} onOpenChange={alternarDrawer}>
				<SheetTrigger asChild>
					<Button type="button" variant="outline" className="shrink-0 gap-2">
						<Filter className="h-4 w-4" />
						Filtros
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

			{/* Só aparece com filtro aplicado — limpa tudo de uma vez sem precisar abrir o drawer.
			    Escondido no mobile (o mesmo botão já existe dentro do drawer): não tem espaço
			    sobrando ao lado de Busca+Filtros na linha estreita. */}
			{filtrosAtivos > 0 ? (
				<Button
					type="button"
					variant="ghost"
					className="hidden shrink-0 gap-1.5 text-muted-foreground sm:inline-flex"
					onClick={limparFiltros}
				>
					<X className="h-4 w-4" />
					Limpar filtros
				</Button>
			) : null}
		</div>
	);
}
