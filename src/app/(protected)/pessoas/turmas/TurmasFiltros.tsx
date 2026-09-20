"use client";

import { Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { useState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const TODOS = "__todos__";

interface TurmasFiltrosProps {
	opcoesAssunto: string[];
}

// `busca` não tem campo na tela — só chega por deep link da busca global (Cmd+K) em
// `/pessoas/turmas?busca=<nome>`. Entra aqui pra contar no badge e sair com "Limpar filtros".
const FILTRO_KEYS = [
	"busca",
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
 * Botão "Filtros" (mora no header da página, junto de Exportar/Nova turma) que abre um drawer com
 * Tipo + Assunto/Repasse/Mensalidade/Início/Vagas. A busca por nome não existe mais aqui — quem
 * resolve é a busca global do header. Dentro do drawer nada aplica sozinho: só ao clicar
 * "Aplicar", pra não disparar uma navegação a cada tecla/clique.
 */
export function TurmasFiltros({ opcoesAssunto }: TurmasFiltrosProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [open, setOpen] = useState(false);

	const [draftTipo, setDraftTipo] = useState(searchParams.get("tipo") ?? TODOS);
	const [draftAssunto, setDraftAssunto] = useState(searchParams.get("assunto") ?? TODOS);
	const [draftRepasseTipo, setDraftRepasseTipo] = useState(searchParams.get("repasseTipo") ?? TODOS);
	const [draftMensalidadeMin, setDraftMensalidadeMin] = useState(searchParams.get("mensalidadeMin") ?? "");
	const [draftMensalidadeMax, setDraftMensalidadeMax] = useState(searchParams.get("mensalidadeMax") ?? "");
	const [draftInicioDe, setDraftInicioDe] = useState(searchParams.get("inicioDe") ?? "");
	const [draftInicioAte, setDraftInicioAte] = useState(searchParams.get("inicioAte") ?? "");
	const [draftVagasMin, setDraftVagasMin] = useState(searchParams.get("vagasMin") ?? "");
	const [draftVagasMax, setDraftVagasMax] = useState(searchParams.get("vagasMax") ?? "");

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
	);
}
