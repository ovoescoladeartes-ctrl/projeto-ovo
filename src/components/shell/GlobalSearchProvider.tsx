"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { Role } from "@/core/auth/Role";

import { GlobalSearchDialog } from "./GlobalSearchDialog";

interface GlobalSearchContextValue {
	open: boolean;
	setOpen: (open: boolean) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function useGlobalSearch(): GlobalSearchContextValue {
	const context = useContext(GlobalSearchContext);
	if (context === null) {
		throw new Error("useGlobalSearch precisa ser usado dentro de um GlobalSearchProvider");
	}
	return context;
}

interface GlobalSearchProviderProps {
	role: Role;
	children: React.ReactNode;
}

/**
 * Dono do estado do diálogo de busca global e do atalho Cmd+K/Ctrl+K — montado uma vez em
 * `SidebarShell` pra que os dois gatilhos visuais (dentro de `PageHeader` no desktop, dentro de
 * `MobileHeader` no mobile) abram o mesmo `CommandDialog`, sem duplicar diálogo nem listener.
 */
export function GlobalSearchProvider({ role, children }: GlobalSearchProviderProps): React.ReactElement {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent): void {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen((atual) => !atual);
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<GlobalSearchContext.Provider value={{ open, setOpen }}>
			{children}
			<GlobalSearchDialog role={role} />
		</GlobalSearchContext.Provider>
	);
}
