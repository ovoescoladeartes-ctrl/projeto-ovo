"use client";

import { ChevronRight, Home, Settings, Users, Wallet, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Role } from "@/core/auth/Role";

import { UserMenu } from "./UserMenu";

interface SideNavProps {
	user: {
		displayName: string;
		role: Role;
	};
}

interface NavItem {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	href: string | null;
	roles: readonly Role[];
}

const NAV_ITEMS: readonly NavItem[] = [
	{ label: "Dashboard", icon: Home, href: "/", roles: ["admin", "financeiro", "comunicacao", "educador"] },
	{ label: "Vagões (em breve)", icon: Workflow, href: null, roles: ["admin", "comunicacao"] },
	{ label: "Pessoas (em breve)", icon: Users, href: null, roles: ["admin", "comunicacao"] },
	{ label: "Caixa (em breve)", icon: Wallet, href: null, roles: ["admin", "financeiro"] },
	{ label: "Usuários", icon: Settings, href: "/admin/usuarios", roles: ["admin"] },
];

export function SideNav({ user }: SideNavProps): React.ReactElement {
	const pathname = usePathname();

	return (
		<TooltipProvider delayDuration={200}>
			<nav className="relative flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-background py-4">
				<Button
					type="button"
					variant="outline"
					size="icon"
					disabled
					aria-label="Expandir menu"
					className="absolute -right-3 top-4 h-6 w-6 rounded-full bg-background"
				>
					<ChevronRight className="h-3.5 w-3.5" />
				</Button>

				<ul className="mt-8 flex flex-1 flex-col items-center gap-1">
					{NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map((item) => {
						const href = item.href;
						const isActive = href !== null && pathname === href;

						return (
							<li key={item.label}>
								<Tooltip>
									<TooltipTrigger asChild>
										{href === null ? (
											<span
												aria-disabled="true"
												className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/50"
											>
												<item.icon className="h-5 w-5" />
											</span>
										) : (
											<Link
												href={href}
												aria-label={item.label}
												className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground ${
													isActive ? "bg-accent text-accent-foreground" : "text-foreground"
												}`}
											>
												<item.icon className="h-5 w-5" />
											</Link>
										)}
									</TooltipTrigger>
									<TooltipContent side="right">{item.label}</TooltipContent>
								</Tooltip>
							</li>
						);
					})}
				</ul>

				<UserMenu displayName={user.displayName} />
			</nav>
		</TooltipProvider>
	);
}
