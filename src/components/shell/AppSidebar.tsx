"use client";

import { ChevronLeft, ChevronRight, Home, Settings, Users, Wallet, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import type { Role } from "@/core/auth/Role";

import { UserMenu } from "./UserMenu";

interface AppSidebarProps {
	user: {
		displayName: string;
		email: string;
		role: Role;
	};
}

interface NavItem {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	href: string | null;
	roles: readonly Role[];
}

/** Ordem e conjunto espelham exatamente a sidebar do Figma (node 187-1752). */
const NAV_ITEMS: readonly NavItem[] = [
	{ label: "Dashboard", icon: Home, href: "/", roles: ["admin", "financeiro", "comunicacao", "educador"] },
	{ label: "Vagões", icon: Workflow, href: "/vagoes", roles: ["admin", "comunicacao"] },
	{ label: "Cadastro", icon: Users, href: "/pessoas", roles: ["admin", "comunicacao", "financeiro"] },
	{ label: "Caixa", icon: Wallet, href: "/caixa", roles: ["admin", "financeiro"] },
	{ label: "Configurações", icon: Settings, href: null, roles: ["admin", "financeiro", "comunicacao", "educador"] },
];

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
						const isActive =
							item.href !== null &&
							(pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)));

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
										<Link href={item.href}>
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
