import { GraduationCap, Home, Users, Wallet, Workflow } from "lucide-react";

import type { Role } from "@/core/auth/Role";

export interface NavChild {
	label: string;
	href: string;
}

export interface NavItem {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	href: string | null;
	roles: readonly Role[];
	/** Presença deste campo transforma o item num grupo expansível (ex.: Cadastro → Pessoas/Turmas). */
	children?: readonly NavChild[];
}

/**
 * Ordem e conjunto espelham exatamente a sidebar do Figma (node 187-1752). Fonte única
 * compartilhada por `AppSidebar` (desktop) e `MobileNavSheet` (menu mobile em tela cheia) — nunca
 * duplique esta lista.
 */
export const NAV_ITEMS: readonly NavItem[] = [
	{ label: "Dashboard", icon: Home, href: "/", roles: ["admin", "financeiro", "comunicacao", "educador"] },
	{ label: "Vagões", icon: Workflow, href: "/vagoes", roles: ["admin", "comunicacao"] },
	{ label: "Pessoas", icon: Users, href: "/pessoas", roles: ["admin", "comunicacao", "financeiro"] },
	{ label: "Turmas", icon: GraduationCap, href: "/pessoas/turmas", roles: ["admin", "comunicacao", "financeiro"] },
	{ label: "Caixa", icon: Wallet, href: "/caixa", roles: ["admin", "financeiro"] },
];

export function rotaAtiva(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Entre os filhos cujo `href` bate com a rota atual (por igualdade ou prefixo), só o de `href`
 * mais longo conta como ativo — evita que "/pessoas" capture "/pessoas/turmas" também, já que o
 * segundo começa com o primeiro. Retorna `null` se nenhum filho bate.
 */
export function childMaisEspecificoAtivo(children: readonly NavChild[], pathname: string): string | null {
	const candidatos = children.filter((child) => rotaAtiva(pathname, child.href));
	if (candidatos.length === 0) {
		return null;
	}
	return candidatos.reduce((maisEspecifico, atual) => (atual.href.length > maisEspecifico.href.length ? atual : maisEspecifico))
		.href;
}

export function grupoDaRota(pathname: string): string | null {
	const item = NAV_ITEMS.find((candidato) => candidato.children !== undefined && childMaisEspecificoAtivo(candidato.children, pathname) !== null);
	return item?.label ?? null;
}
