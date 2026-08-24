import { GraduationCap, Home, Settings, Wallet, Workflow } from "lucide-react";

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
 * Ordem e conjunto espelham a sidebar do Figma (node 187-1752 pro esqueleto original; o grupo
 * "Caixa" com Checklist/Pendências/Fechamento veio de uma entrega posterior, node 230-1791).
 * Fonte única compartilhada por `AppSidebar` (desktop) e `MobileNavSheet` (menu mobile em tela
 * cheia) — nunca duplique esta lista.
 */
export const NAV_ITEMS: readonly NavItem[] = [
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
	{
		label: "Caixa",
		icon: Wallet,
		href: null,
		roles: ["admin", "financeiro"],
		children: [
			{ label: "Recebimentos", href: "/caixa" },
			{ label: "Checklist", href: "/caixa/checklist" },
			{ label: "Pendências", href: "/caixa/pendencias" },
			{ label: "Fechamento", href: "/caixa/fechamento" },
		],
	},
	{
		label: "Configurações",
		icon: Settings,
		href: null,
		roles: ["admin", "comunicacao"],
		children: [{ label: "Mensagens", href: "/mensagens" }],
	},
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
