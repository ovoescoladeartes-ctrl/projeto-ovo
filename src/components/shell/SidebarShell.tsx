"use client";

import { useEffect, useState } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { Role } from "@/core/auth/Role";

import { AppSidebar } from "./AppSidebar";

const STORAGE_KEY = "trilho:sidebar-expanded";

interface SidebarShellProps {
	user: {
		displayName: string;
		email: string;
		role: Role;
	};
	children: React.ReactNode;
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
				<header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
					<SidebarTrigger className="h-10 w-10" />
					<span className="text-base font-semibold">Trilho</span>
				</header>
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
