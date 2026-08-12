"use client";

import { ChevronDown, Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const TODOS = "__todos__";

interface FiltrosAvancadosSheetProps {
	opcoesInteresse: string[];
	opcoesTurma: string[];
}

const STATUS_OPCOES = [
	{ value: "lead", label: "Lead" },
	{ value: "matriculado", label: "Matriculado" },
];

/**
 * Agrupa Status, Interesse e Turma — filtros usados com menos frequência que Busca/Papel, por
 * isso ficam atrás deste gatilho em vez de sempre visíveis na barra (docs do wireframe de Cadastro).
 */
export function FiltrosAvancadosSheet({ opcoesInteresse, opcoesTurma }: FiltrosAvancadosSheetProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [open, setOpen] = useState(false);

	const status = searchParams.get("status") ?? TODOS;
	const interesse = searchParams.get("interesse") ?? TODOS;
	const turma = searchParams.get("turma") ?? TODOS;

	const filtrosAtivos = [status, interesse, turma].filter((valor) => valor !== TODOS).length;

	function atualizarFiltro(chave: "status" | "interesse" | "turma", valor: string): void {
		const params = new URLSearchParams(searchParams.toString());
		if (valor === TODOS) {
			params.delete(chave);
		} else {
			params.set(chave, valor);
		}
		params.delete("pagina");
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					className="h-[30px] cursor-pointer gap-2 rounded-lg bg-soft text-[13px] hover:!bg-soft-hover"
				>
					<Filter className="h-4 w-4" strokeWidth={2.4} />
					Filtros avançados
					{filtrosAtivos > 0 ? (
						<Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
							{filtrosAtivos}
						</Badge>
					) : null}
					<ChevronDown className="h-4 w-4" strokeWidth={2.4} />
				</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Filtros avançados</SheetTitle>
				</SheetHeader>

				<div className="mt-6 space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="filtro-status">Status</Label>
						<Select value={status} onValueChange={(value) => atualizarFiltro("status", value)}>
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
						<Select
							value={interesse}
							onValueChange={(value) => atualizarFiltro("interesse", value)}
							disabled={opcoesInteresse.length === 0}
						>
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
						<Select value={turma} onValueChange={(value) => atualizarFiltro("turma", value)} disabled={opcoesTurma.length === 0}>
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
			</SheetContent>
		</Sheet>
	);
}
