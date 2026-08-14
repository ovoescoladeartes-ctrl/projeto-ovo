"use client";

import { ChevronDown, ChevronLeft, ChevronRight, GraduationCap, Home, Settings, Wallet, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import type { Role } from "@/core/auth/Role";
import { cn } from "@/lib/utils";

import { UserMenu } from "./UserMenu";

interface AppSidebarProps {
	user: {
		displayName: string;
		email: string;
		role: Role;
	};
}

interface NavChild {
	label: string;
	href: string;
}

interface NavItem {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	href: string | null;
	roles: readonly Role[];
	/** Presença deste campo transforma o item num grupo expansível (ex.: Cadastro → Pessoas/Turmas). */
	children?: readonly NavChild[];
}

/** Ordem e conjunto espelham exatamente a sidebar do Figma (node 187-1752). */
const NAV_ITEMS: readonly NavItem[] = [
	{ label: "Dashboard", icon: Home, href: "/", roles: ["admin", "financeiro", "comunicacao", "educador"] },
	{ label: "Vagões", icon: Workflow, href: "/vagoes", roles: ["admin", "comunicacao"] },
	{
		label: "Cadastro",
		icon: GraduationCap,
		href: null,
		roles: ["admin", "comunicacao", "financeiro"],
		children: [
			{ label: "Pessoas", href: "/pessoas" },
			{ label: "Turmas", href: "/pessoas/turmas" },
		],
	},
	{ label: "Caixa", icon: Wallet, href: "/caixa", roles: ["admin", "financeiro"] },
	{
		label: "Configurações",
		icon: Settings,
		href: null,
		roles: ["admin", "comunicacao"],
		children: [{ label: "Mensagens", href: "/mensagens" }],
	},
];

function rotaAtiva(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Entre os filhos cujo `href` bate com a rota atual (por igualdade ou prefixo), só o de `href`
 * mais longo conta como ativo — evita que "/pessoas" capture "/pessoas/turmas" também, já que o
 * segundo começa com o primeiro. Retorna `null` se nenhum filho bate.
 */
function childMaisEspecificoAtivo(children: readonly NavChild[], pathname: string): string | null {
	const candidatos = children.filter((child) => rotaAtiva(pathname, child.href));
	if (candidatos.length === 0) {
		return null;
	}
	return candidatos.reduce((maisEspecifico, atual) => (atual.href.length > maisEspecifico.href.length ? atual : maisEspecifico))
		.href;
}

function grupoDaRota(pathname: string): string | null {
	const item = NAV_ITEMS.find((candidato) => candidato.children !== undefined && childMaisEspecificoAtivo(candidato.children, pathname) !== null);
	return item?.label ?? null;
}

function SidebarToggleButton(): React.ReactElement {
	const { state, isMobile, openMobile, toggleSidebar } = useSidebar();
	const isExpanded = isMobile ? openMobile : state === "expanded";

	return (
		<Button
			type="button"
			variant="outline"
			size="icon"
			onClick={toggleSidebar}
			aria-label={isExpanded ? "Colapsar menu" : "Expandir menu"}
			className="h-6 w-6 shrink-0 rounded-full bg-background"
		>
			{isExpanded ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
		</Button>
	);
}

export function AppSidebar({ user }: AppSidebarProps): React.ReactElement {
	const pathname = usePathname();
	const { state, isMobile, setOpenMobile } = useSidebar();
	// No mobile a sidebar é sempre o drawer expandido (ver SidebarToggleButton) — só o rail
	// desktop colapsado esconde `SidebarMenuSub` (`group-data-[collapsible=icon]:hidden` em
	// ui/sidebar.tsx), tornando "Cadastro"/"Configurações" inclicáveis nesse estado.
	const railColapsado = state === "collapsed" && !isMobile;

	// No mobile a sidebar é um drawer (Sheet) sobre o conteúdo — sem isso, navegar deixava o
	// drawer aberto por cima da página nova, escondendo o resultado do clique.
	function fecharDrawerNoMobile(): void {
		if (isMobile) {
			setOpenMobile(false);
		}
	}
	const [gruposAbertos, setGruposAbertos] = useState<ReadonlySet<string>>(() => {
		const grupo = grupoDaRota(pathname);
		return grupo !== null ? new Set([grupo]) : new Set();
	});

	// Reafirma (nunca força) o grupo expandido a cada navegação — depois disso o toggle manual
	// funciona livremente até a próxima mudança de rota, sem o "OR" que travava o recolher.
	useEffect(() => {
		const grupo = grupoDaRota(pathname);
		if (grupo === null) {
			return;
		}
		setGruposAbertos((atual) => (atual.has(grupo) ? atual : new Set(atual).add(grupo)));
	}, [pathname]);

	function alternarGrupo(label: string): void {
		setGruposAbertos((atual) => {
			const proximo = new Set(atual);
			if (proximo.has(label)) {
				proximo.delete(label);
			} else {
				proximo.add(label);
			}
			return proximo;
		});
	}

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="gap-0 px-4 py-4">
				<div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
					<div className="min-w-0 group-data-[collapsible=icon]:hidden">
						<p className="truncate text-lg font-semibold leading-tight">Trilho</p>
						<p className="mt-0.5 truncate text-xs text-muted-foreground">OVO Escola de Artes</p>
					</div>
					<SidebarToggleButton />
				</div>
			</SidebarHeader>

			<SidebarContent className="gap-1 px-4 py-2">
				<SidebarMenu className="gap-1.5">
					{NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map((item) => {
						if (item.children !== undefined) {
							const childAtivoHref = childMaisEspecificoAtivo(item.children, pathname);
							const grupoAtivo = childAtivoHref !== null;

							// Rail colapsado: `SidebarMenuSub` fica sempre `hidden` nesse estado (é o rail de
							// ícones), então expandir o grupo inline não mostraria nada — em vez disso, o clique
							// abre um flyout (mesmo padrão de `UserMenu`, `DropdownMenu` com `side="right"`) com
							// os links, sem forçar a sidebar inteira a expandir.
							if (railColapsado) {
								return (
									<SidebarMenuItem key={item.label}>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<SidebarMenuButton
													isActive={grupoAtivo}
													aria-label={item.label}
													className={grupoAtivo ? "gap-3 font-semibold" : "gap-3"}
												>
													<item.icon className="h-5 w-5" />
													<span>{item.label}</span>
												</SidebarMenuButton>
											</DropdownMenuTrigger>
											<DropdownMenuContent side="right" align="start" className="w-48">
												<DropdownMenuLabel>{item.label}</DropdownMenuLabel>
												{item.children.map((child) => (
													<DropdownMenuItem key={child.href} asChild>
														<Link href={child.href}>{child.label}</Link>
													</DropdownMenuItem>
												))}
											</DropdownMenuContent>
										</DropdownMenu>
									</SidebarMenuItem>
								);
							}

							const aberto = gruposAbertos.has(item.label);

							return (
								<SidebarMenuItem key={item.label}>
									{grupoAtivo && (
										<span
											aria-hidden
											className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-foreground group-data-[collapsible=icon]:hidden"
										/>
									)}
									<SidebarMenuButton
										onClick={() => alternarGrupo(item.label)}
										isActive={grupoAtivo}
										tooltip={item.label}
										aria-expanded={aberto}
										className={grupoAtivo ? "gap-3 font-semibold" : "gap-3"}
									>
										<item.icon className="h-5 w-5" />
										<span>{item.label}</span>
										<ChevronDown
											className={cn("ml-auto h-4 w-4 shrink-0 transition-transform", aberto && "rotate-180")}
										/>
									</SidebarMenuButton>
									{aberto ? (
										<SidebarMenuSub>
											{item.children.map((child) => {
												const childActive = child.href === childAtivoHref;
												return (
													<SidebarMenuSubItem key={child.href}>
														<SidebarMenuSubButton asChild isActive={childActive}>
															<Link href={child.href} onClick={fecharDrawerNoMobile}>
																{child.label}
															</Link>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												);
											})}
										</SidebarMenuSub>
									) : null}
								</SidebarMenuItem>
							);
						}

						const isActive = item.href !== null && rotaAtiva(pathname, item.href);

						return (
							<SidebarMenuItem key={item.label}>
								{isActive && (
									<span
										aria-hidden
										className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-foreground group-data-[collapsible=icon]:hidden"
									/>
								)}
								{item.href === null ? (
									<SidebarMenuButton disabled tooltip={item.label} className="gap-3">
										<item.icon className="h-5 w-5" />
										<span>{item.label}</span>
									</SidebarMenuButton>
								) : (
									<SidebarMenuButton
										asChild
										isActive={isActive}
										tooltip={item.label}
										className={isActive ? "gap-3 font-semibold" : "gap-3"}
									>
										<Link href={item.href} onClick={fecharDrawerNoMobile}>
											<item.icon className="h-5 w-5" />
											<span>{item.label}</span>
										</Link>
									</SidebarMenuButton>
								)}
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarContent>

			<SidebarFooter className="px-4 py-4">
				<UserMenu displayName={user.displayName} email={user.email} />
			</SidebarFooter>
		</Sidebar>
	);
}
