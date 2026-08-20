"use client";

import { ChevronDown, Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DatePicker } from "@/components/DatePicker";

const TODOS = "__todos__";

interface TurmasFiltrosAvancadosSheetProps {
	opcoesAssunto: string[];
}

function atualizarParam(searchParams: ReadonlyURLSearchParams, chave: string, valor: string): URLSearchParams {
	const params = new URLSearchParams(searchParams.toString());
	if (valor === "" || valor === TODOS) {
		params.delete(chave);
	} else {
		params.set(chave, valor);
	}
	return params;
}

/**
 * Campo numérico/data que navega com debounce em vez de a cada tecla — os Selects desta mesma
 * tela (Assunto, Repasse) continuam aplicando na hora, só os campos de digitação livre (faixa de
 * mensalidade/vagas, período) esperam a pessoa parar de digitar.
 */
function useFiltroComDebounce(
	chave: string,
	valor: string,
	router: ReturnType<typeof useRouter>,
	pathname: string,
	searchParams: ReadonlyURLSearchParams,
): void {
	useEffect(() => {
		const atual = searchParams.get(chave) ?? "";
		if (valor === atual) {
			return;
		}
		const timeout = setTimeout(() => {
			const params = atualizarParam(searchParams, chave, valor);
			const query = params.toString();
			router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
		}, 400);
		return () => clearTimeout(timeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [chave, valor]);
}

export function TurmasFiltrosAvancadosSheet({ opcoesAssunto }: TurmasFiltrosAvancadosSheetProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [open, setOpen] = useState(false);

	const assunto = searchParams.get("assunto") ?? TODOS;
	const repasseTipo = searchParams.get("repasseTipo") ?? TODOS;

	const [mensalidadeMin, setMensalidadeMin] = useState(searchParams.get("mensalidadeMin") ?? "");
	const [mensalidadeMax, setMensalidadeMax] = useState(searchParams.get("mensalidadeMax") ?? "");
	const [inicioDe, setInicioDe] = useState(searchParams.get("inicioDe") ?? "");
	const [inicioAte, setInicioAte] = useState(searchParams.get("inicioAte") ?? "");
	const [vagasMin, setVagasMin] = useState(searchParams.get("vagasMin") ?? "");
	const [vagasMax, setVagasMax] = useState(searchParams.get("vagasMax") ?? "");

	useFiltroComDebounce("mensalidadeMin", mensalidadeMin, router, pathname, searchParams);
	useFiltroComDebounce("mensalidadeMax", mensalidadeMax, router, pathname, searchParams);
	useFiltroComDebounce("inicioDe", inicioDe, router, pathname, searchParams);
	useFiltroComDebounce("inicioAte", inicioAte, router, pathname, searchParams);
	useFiltroComDebounce("vagasMin", vagasMin, router, pathname, searchParams);
	useFiltroComDebounce("vagasMax", vagasMax, router, pathname, searchParams);

	const filtrosAtivos = [
		assunto,
		repasseTipo,
		searchParams.get("mensalidadeMin"),
		searchParams.get("mensalidadeMax"),
		searchParams.get("inicioDe"),
		searchParams.get("inicioAte"),
		searchParams.get("vagasMin"),
		searchParams.get("vagasMax"),
	].filter((valor) => valor !== null && valor !== TODOS).length;

	function atualizarSelect(chave: "assunto" | "repasseTipo", valor: string): void {
		const params = atualizarParam(searchParams, chave, valor);
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button type="button" variant="outline" className="gap-2">
					<Filter className="h-4 w-4" />
					Filtros avançados
					{filtrosAtivos > 0 ? (
						<Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
							{filtrosAtivos}
						</Badge>
					) : null}
					<ChevronDown className="h-4 w-4" />
				</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Filtros avançados</SheetTitle>
				</SheetHeader>

				<div className="mt-6 space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="filtro-assunto">Assunto</Label>
						<Select
							value={assunto}
							onValueChange={(value) => atualizarSelect("assunto", value)}
							disabled={opcoesAssunto.length === 0}
						>
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
						<Select value={repasseTipo} onValueChange={(value) => atualizarSelect("repasseTipo", value)}>
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
									value={mensalidadeMin}
									onChange={(event) => setMensalidadeMin(event.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-xs font-normal text-muted-foreground">Máximo</Label>
								<Input
									inputMode="decimal"
									placeholder="Máximo"
									value={mensalidadeMax}
									onChange={(event) => setMensalidadeMax(event.target.value)}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label>Início</Label>
						<div className="space-y-2">
							<div className="space-y-1">
								<Label className="text-xs font-normal text-muted-foreground">De</Label>
								<DatePicker value={inicioDe} onChange={setInicioDe} />
							</div>
							<div className="space-y-1">
								<Label className="text-xs font-normal text-muted-foreground">Até</Label>
								<DatePicker value={inicioAte} onChange={setInicioAte} />
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
									value={vagasMin}
									onChange={(event) => setVagasMin(event.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-xs font-normal text-muted-foreground">Máximo</Label>
								<Input
									inputMode="numeric"
									placeholder="Máximo"
									value={vagasMax}
									onChange={(event) => setVagasMax(event.target.value)}
								/>
							</div>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
