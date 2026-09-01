"use client";

import { Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const TODOS = "__todos__";

interface TurmasBuscaEFiltrosProps {
	opcoesAssunto: string[];
}

const FILTRO_KEYS = [
	"tipo",
	"assunto",
	"repasseTipo",
	"mensalidadeMin",
	"mensalidadeMax",
	"inicioDe",
	"inicioAte",
	"vagasMin",
	"vagasMax",
] as const;

function contarFiltrosAtivos(searchParams: ReadonlyURLSearchParams): number {
	return FILTRO_KEYS.filter((chave) => searchParams.get(chave) !== null).length;
}

/**
 * Busca por nome (sempre visível, aplica sozinha com debounce) + botão único "Filtros" que abre
 * um drawer com Tipo + Assunto/Repasse/Mensalidade/Início/Vagas (antigo "Filtros avançados") —
 * junta o que antes eram `TurmasFiltroBar` + `TurmasFiltrosAvancadosSheet` num só componente,
 * centrado no header (regra 15 do design.md). Dentro do drawer nada aplica sozinho: só ao clicar
 * "Aplicar", pra não disparar uma navegação a cada tecla/clique.
 */
export function TurmasBuscaEFiltros({ opcoesAssunto }: TurmasBuscaEFiltrosProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [open, setOpen] = useState(false);

	const [busca, setBusca] = useState(searchParams.get("busca") ?? "");

	const [draftTipo, setDraftTipo] = useState(searchParams.get("tipo") ?? TODOS);
	const [draftAssunto, setDraftAssunto] = useState(searchParams.get("assunto") ?? TODOS);
	const [draftRepasseTipo, setDraftRepasseTipo] = useState(searchParams.get("repasseTipo") ?? TODOS);
	const [draftMensalidadeMin, setDraftMensalidadeMin] = useState(searchParams.get("mensalidadeMin") ?? "");
	const [draftMensalidadeMax, setDraftMensalidadeMax] = useState(searchParams.get("mensalidadeMax") ?? "");
	const [draftInicioDe, setDraftInicioDe] = useState(searchParams.get("inicioDe") ?? "");
	const [draftInicioAte, setDraftInicioAte] = useState(searchParams.get("inicioAte") ?? "");
	const [draftVagasMin, setDraftVagasMin] = useState(searchParams.get("vagasMin") ?? "");
	const [draftVagasMax, setDraftVagasMax] = useState(searchParams.get("vagasMax") ?? "");

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
			setDraftTipo(searchParams.get("tipo") ?? TODOS);
			setDraftAssunto(searchParams.get("assunto") ?? TODOS);
			setDraftRepasseTipo(searchParams.get("repasseTipo") ?? TODOS);
			setDraftMensalidadeMin(searchParams.get("mensalidadeMin") ?? "");
			setDraftMensalidadeMax(searchParams.get("mensalidadeMax") ?? "");
			setDraftInicioDe(searchParams.get("inicioDe") ?? "");
			setDraftInicioAte(searchParams.get("inicioAte") ?? "");
			setDraftVagasMin(searchParams.get("vagasMin") ?? "");
			setDraftVagasMax(searchParams.get("vagasMax") ?? "");
		}
		setOpen(abrir);
	}

	function aplicar(): void {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("pagina");

		function setOuRemove(chave: string, valor: string, vazio: string): void {
			if (valor === vazio) {
				params.delete(chave);
			} else {
				params.set(chave, valor);
			}
		}

		setOuRemove("tipo", draftTipo, TODOS);
		setOuRemove("assunto", draftAssunto, TODOS);
		setOuRemove("repasseTipo", draftRepasseTipo, TODOS);
		setOuRemove("mensalidadeMin", draftMensalidadeMin, "");
		setOuRemove("mensalidadeMax", draftMensalidadeMax, "");
		setOuRemove("inicioDe", draftInicioDe, "");
		setOuRemove("inicioAte", draftInicioAte, "");
		setOuRemove("vagasMin", draftVagasMin, "");
		setOuRemove("vagasMax", draftVagasMax, "");

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
						<div className="space-y-1.5">
							<Label htmlFor="filtro-tipo">Tipo</Label>
							<Select value={draftTipo} onValueChange={setDraftTipo}>
								<SelectTrigger id="filtro-tipo">
									<SelectValue placeholder="Tipo: todos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={TODOS}>Tipo: todos</SelectItem>
									<SelectItem value="curso">Curso</SelectItem>
									<SelectItem value="oficina">Oficina</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="filtro-assunto">Assunto</Label>
							<Select value={draftAssunto} onValueChange={setDraftAssunto} disabled={opcoesAssunto.length === 0}>
								<SelectTrigger id="filtro-assunto">
									<SelectValue placeholder="Assunto: todos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={TODOS}>Assunto: todos</SelectItem>
									{opcoesAssunto.map((opcao) => (
										<SelectItem key={opcao} value={opcao}>
											{opcao}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="filtro-repasse-tipo">Tipo de repasse</Label>
							<Select value={draftRepasseTipo} onValueChange={setDraftRepasseTipo}>
								<SelectTrigger id="filtro-repasse-tipo">
									<SelectValue placeholder="Repasse: todos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={TODOS}>Repasse: todos</SelectItem>
									<SelectItem value="percentual">Percentual</SelectItem>
									<SelectItem value="fixo">Fixo</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label>Mensalidade (R$)</Label>
							<div className="space-y-2">
								<div className="space-y-1">
									<Label className="text-xs font-normal text-muted-foreground">Mínimo</Label>
									<Input
										inputMode="decimal"
										placeholder="Mínimo"
										value={draftMensalidadeMin}
										onChange={(event) => setDraftMensalidadeMin(event.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-xs font-normal text-muted-foreground">Máximo</Label>
									<Input
										inputMode="decimal"
										placeholder="Máximo"
										value={draftMensalidadeMax}
										onChange={(event) => setDraftMensalidadeMax(event.target.value)}
									/>
								</div>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label>Início</Label>
							<div className="space-y-2">
								<div className="space-y-1">
									<Label className="text-xs font-normal text-muted-foreground">De</Label>
									<DatePicker value={draftInicioDe} onChange={setDraftInicioDe} />
								</div>
								<div className="space-y-1">
									<Label className="text-xs font-normal text-muted-foreground">Até</Label>
									<DatePicker value={draftInicioAte} onChange={setDraftInicioAte} />
								</div>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label>Vagas ocupadas</Label>
							<div className="space-y-2">
								<div className="space-y-1">
									<Label className="text-xs font-normal text-muted-foreground">Mínimo</Label>
									<Input
										inputMode="numeric"
										placeholder="Mínimo"
										value={draftVagasMin}
										onChange={(event) => setDraftVagasMin(event.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-xs font-normal text-muted-foreground">Máximo</Label>
									<Input
										inputMode="numeric"
										placeholder="Máximo"
										value={draftVagasMax}
										onChange={(event) => setDraftVagasMax(event.target.value)}
									/>
								</div>
							</div>
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
