"use client";

import { ChevronLeft, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { Role } from "@/core/auth/Role";

import { AppSidebar } from "./AppSidebar";
import { MobileNavSheet } from "./MobileNavSheet";
import { usePageHeader } from "./PageHeaderProvider";
import { UserAvatarMenu } from "./UserMenu";

const STORAGE_KEY = "trilho:sidebar-expanded";

interface SidebarShellProps {
	user: {
		displayName: string;
		email: string;
		role: Role;
	};
	children: React.ReactNode;
}

/**
 * Botão voltar do header mobile — ícone + texto "Voltar", substitui o título por completo (o
 * título da página volta a viver só no `<h1>` da própria página, sempre visível). Usa
 * `router.back()` (histórico real do navegador) sempre que já houve alguma navegação client-side
 * desde que o app carregou (`canGoBack`) — só cai pro `href` calculado (pai lógico do breadcrumb,
 * ou "/") quando a página foi carregada direto (refresh, link externo, primeira tela), caso em
 * que não há histórico de verdade pra voltar.
 */
function BotaoVoltar({ hrefFallback, canGoBack }: { hrefFallback: string; canGoBack: boolean }): React.ReactElement {
	const router = useRouter();

	if (canGoBack) {
		return (
			<Button type="button" variant="ghost" className="shrink-0 gap-1 px-2" onClick={() => router.back()}>
				<ChevronLeft className="h-5 w-5" />
				Voltar
			</Button>
		);
	}

	return (
		<Button type="button" variant="ghost" className="shrink-0 gap-1 px-2" asChild>
			<Link href={hrefFallback}>
				<ChevronLeft className="h-5 w-5" />
				Voltar
			</Link>
		</Button>
	);
}

/**
 * Header `md:hidden`. Na Dashboard (a única rota sem `PageBreadcrumb`, `items === null`):
 * hambúrguer + "Trilho" + avatar de conta. Em toda outra página: só "Voltar" (ícone + texto,
 * `BotaoVoltar`) à esquerda + CTA da página (se houver) à direita — sem título nenhum no header,
 * o título já vive no `<h1>` sempre visível da própria página. Nunca hambúrguer fora da
 * Dashboard, mesmo em página raiz de sidebar (Vagões, Caixa, Pessoas). Hambúrguer abre
 * `MobileNavSheet` (menu em tela cheia exclusivo do mobile), não o drawer parcial do
 * `Sidebar`/rail usado no desktop — ver regra do design.md sobre header mobile.
 */
function MobileHeader({ user }: { user: SidebarShellProps["user"] }): React.ReactElement {
	const { items, cta, canGoBack } = usePageHeader();
	const [menuAberto, setMenuAberto] = useState(false);

	const naDashboard = items === null;
	const hrefVoltar = (!naDashboard ? items[items.length - 2]?.href : undefined) ?? "/";

	return (
		<>
			<header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
				{naDashboard ? (
					<>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-12 w-12 shrink-0"
							aria-label="Abrir menu"
							onClick={() => setMenuAberto(true)}
						>
							<Menu className="!size-6" />
						</Button>
						<span className="min-w-0 flex-1 truncate text-lg font-semibold">Trilho</span>
					</>
				) : (
					<div className="min-w-0 flex-1">
						<BotaoVoltar hrefFallback={hrefVoltar} canGoBack={canGoBack} />
					</div>
				)}
				<div className="flex shrink-0 items-center gap-2">
					{cta}
					{naDashboard ? <UserAvatarMenu displayName={user.displayName} email={user.email} /> : null}
				</div>
			</header>
			<MobileNavSheet
				open={menuAberto}
				onOpenChange={setMenuAberto}
				role={user.role}
				displayName={user.displayName}
				email={user.email}
			/>
		</>
	);
}

export function SidebarShell({ user, children }: SidebarShellProps): React.ReactElement {
	const [expanded, setExpanded] = useState(true);

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved !== null) {
			setExpanded(saved === "true");
		}
	}, []);

	function handleOpenChange(open: boolean): void {
		setExpanded(open);
		localStorage.setItem(STORAGE_KEY, String(open));
	}

	return (
		<SidebarProvider open={expanded} onOpenChange={handleOpenChange} style={{ "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
			<AppSidebar user={user} />
			<SidebarInset>
				<MobileHeader user={user} />
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
