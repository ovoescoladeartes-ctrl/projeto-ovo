"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { getFirebaseAuth } from "@/core/firebase/firebaseClient";

interface UserMenuProps {
	displayName: string;
	email: string;
}

function getInitials(displayName: string): string {
	const parts = displayName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return "?";
	}
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
	return (first + last).toUpperCase();
}

/** Compartilhado por `UserMenu` (rodapé da sidebar) e `UserAvatarMenu` (header mobile). */
function useLogout(): { saindo: boolean; handleLogout: () => Promise<void> } {
	const router = useRouter();
	const [saindo, setSaindo] = useState(false);

	async function handleLogout(): Promise<void> {
		setSaindo(true);
		try {
			await getFirebaseAuth().signOut();
			await fetch("/api/auth/session", { method: "DELETE" });
		} finally {
			router.push("/login");
		}
	}

	return { saindo, handleLogout };
}

/**
 * Versão compacta do `UserMenu` pro header mobile da Dashboard (ver regra do design.md sobre
 * header mobile) — só o avatar como trigger, mesmo dropdown de logout, sem o layout de linha
 * inteira (nome + email + chevron) que só faz sentido no rodapé largo da sidebar.
 */
export function UserAvatarMenu({ displayName, email }: UserMenuProps): React.ReactElement {
	const { saindo, handleLogout } = useLogout();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="ghost" className="h-11 gap-1 px-1.5" aria-label="Menu do usuário">
					<Avatar className="h-8 w-8 rounded-full">
						<AvatarFallback className="rounded-full bg-primary text-sm font-medium text-primary-foreground">
							{getInitials(displayName)}
						</AvatarFallback>
					</Avatar>
					<ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<div className="px-2 py-1.5 text-sm">
					<p className="truncate font-medium">{displayName || "Usuária"}</p>
					<p className="truncate text-xs text-muted-foreground">{email}</p>
				</div>
				<DropdownMenuItem onSelect={handleLogout} disabled={saindo}>
					<LogOut className="h-4 w-4" />
					{saindo ? "Saindo..." : "Sair"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function UserMenu({ displayName, email }: UserMenuProps): React.ReactElement {
	const { saindo, handleLogout } = useLogout();

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton size="lg" aria-label="Menu do usuário">
							<Avatar className="h-8 w-8 rounded-full">
								<AvatarFallback className="rounded-full bg-primary text-sm font-medium text-primary-foreground">
									{getInitials(displayName)}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{displayName || "Usuária"}</span>
								<span className="truncate text-xs text-muted-foreground">{email}</span>
							</div>
							<ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="right" align="end" className="w-56">
						<DropdownMenuItem onSelect={handleLogout} disabled={saindo}>
							<LogOut className="h-4 w-4" />
							{saindo ? "Saindo..." : "Sair"}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
