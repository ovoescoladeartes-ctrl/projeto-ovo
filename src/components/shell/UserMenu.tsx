"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export function UserMenu({ displayName, email }: UserMenuProps): React.ReactElement {
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
