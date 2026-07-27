"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/core/firebase/firebaseClient";

interface UserMenuProps {
	displayName: string;
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

export function UserMenu({ displayName }: UserMenuProps): React.ReactElement {
	const router = useRouter();
	const [saindo, setSaindo] = useState(false);

	async function handleLogout(): Promise<void> {
		setSaindo(true);
		try {
			await auth.signOut();
			await fetch("/api/auth/session", { method: "DELETE" });
		} finally {
			router.push("/login");
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label="Menu do usuário"
				>
					<Avatar className="h-9 w-9">
						<AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
							{getInitials(displayName)}
						</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent side="right" align="end" className="w-48">
				<div className="px-2 py-1.5 text-sm font-medium">{displayName || "Usuária"}</div>
				<DropdownMenuItem onSelect={handleLogout} disabled={saindo}>
					<LogOut className="h-4 w-4" />
					{saindo ? "Saindo..." : "Sair"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
