"use client";

import { GraduationCap, Users, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Role } from "@/core/auth/Role";
import { normalizar } from "@/core/pessoas/normalizar";
import { buscarGlobal, type ResultadoBusca, type ResultadoBuscaTipo } from "@/core/search/actions";

import { useGlobalSearch } from "./GlobalSearchProvider";
import { NAV_ITEMS, type NavItem } from "./navItems";

const ICONES: Record<ResultadoBuscaTipo, React.ComponentType<{ className?: string }>> = {
	pessoa: Users,
	turma: GraduationCap,
	contato: Workflow,
};

const GRUPO_LABELS: Record<ResultadoBuscaTipo, string> = {
	pessoa: "Pessoas",
	turma: "Turmas",
	contato: "Vagões",
};

const ORDEM_GRUPOS: readonly ResultadoBuscaTipo[] = ["pessoa", "turma", "contato"];
// 3 caracteres + 400ms (em vez de 2/250ms): cada busca varre pessoas+turmas+contatos inteiros no
// servidor (~130 leituras Firestore por round-trip) — ver src/core/search/actions.ts. Reduz o
// número de round-trips por sessão de digitação; a redução de custo por leitura vem do cache em
// src/core/db/.
const TAMANHO_MINIMO_TERMO = 3;

interface GlobalSearchDialogProps {
	role: Role;
}

export function GlobalSearchDialog({ role }: GlobalSearchDialogProps): React.ReactElement {
	const { open, setOpen } = useGlobalSearch();
	const router = useRouter();
	const [termo, setTermo] = useState("");
	const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
	const [isPending, startTransition] = useTransition();

	const termoValido = termo.trim().length >= TAMANHO_MINIMO_TERMO;

	// Match contra `NAV_ITEMS` (label + `keywords`) é local e instantâneo — não precisa do debounce
	// nem do round-trip ao servidor que os resultados de pessoa/turma/contato dependem.
	const paginas = useMemo(() => {
		if (!termoValido) {
			return [];
		}
		const termoNormalizado = normalizar(termo.trim());
		return NAV_ITEMS.filter((item): item is NavItem & { href: string } => item.href !== null && item.roles.includes(role)).filter(
			(item) =>
				normalizar(item.label).includes(termoNormalizado) ||
				(item.keywords?.some((palavra) => normalizar(palavra).includes(termoNormalizado)) ?? false),
		);
	}, [termo, termoValido, role]);

	useEffect(() => {
		if (!termoValido) {
			setResultados([]);
			return;
		}
		const termoAtual = termo.trim();
		const timer = setTimeout(() => {
			startTransition(async () => {
				setResultados(await buscarGlobal(termoAtual));
			});
		}, 400);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [termo, termoValido]);

	function handleOpenChange(proximo: boolean): void {
		setOpen(proximo);
		if (!proximo) {
			// Evita mostrar o resultado da busca anterior por um instante na próxima abertura.
			setTermo("");
			setResultados([]);
		}
	}

	function irPara(href: string): void {
		router.push(href);
		handleOpenChange(false);
	}

	return (
		<CommandDialog
			open={open}
			onOpenChange={handleOpenChange}
			title="Busca global"
			description="Busque por pessoas, turmas e vagões e navegue direto até a página."
		>
			<CommandInput placeholder="Buscar por nome, turma, lead ou uma página do sistema..." value={termo} onValueChange={setTermo} />
			<CommandList>
				{!termoValido ? (
					<CommandGroup heading="Navegação rápida">
						{NAV_ITEMS.filter(
							(item): item is NavItem & { href: string } => item.href !== null && item.roles.includes(role),
						).map((item) => (
							<CommandItem key={item.href} value={item.href} onSelect={() => irPara(item.href)}>
								<item.icon className="h-4 w-4" />
								{item.label}
							</CommandItem>
						))}
					</CommandGroup>
				) : (
					<>
						<CommandEmpty>{isPending ? "Buscando..." : "Nenhum resultado encontrado."}</CommandEmpty>

						{paginas.length > 0 ? (
							<CommandGroup heading="Páginas">
								{paginas.map((item) => (
									<CommandItem key={item.href} value={`pagina-${item.href}`} onSelect={() => irPara(item.href)}>
										<item.icon className="h-4 w-4" />
										{item.label}
									</CommandItem>
								))}
							</CommandGroup>
						) : null}

						{ORDEM_GRUPOS.map((tipo) => {
							const itens = resultados.filter((resultado) => resultado.tipo === tipo);
							if (itens.length === 0) {
								return null;
							}
							const Icone = ICONES[tipo];
							return (
								<CommandGroup key={tipo} heading={GRUPO_LABELS[tipo]}>
									{itens.map((resultado) => (
										<CommandItem
											key={`${resultado.tipo}-${resultado.id}`}
											value={`${resultado.tipo}-${resultado.id}`}
											onSelect={() => irPara(resultado.href)}
										>
											<Icone className="h-4 w-4" />
											<div className="flex min-w-0 flex-col">
												<span className="truncate">{resultado.titulo}</span>
												<span className="truncate text-xs text-muted-foreground">{resultado.subtitulo}</span>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							);
						})}
					</>
				)}
			</CommandList>
		</CommandDialog>
	);
}
