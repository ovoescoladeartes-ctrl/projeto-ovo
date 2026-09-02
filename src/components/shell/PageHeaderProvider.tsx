"use client";

import { createContext, useCallback, useContext, useState } from "react";

import type { BreadcrumbSegment } from "./PageBreadcrumb";

interface PageHeaderContextValue {
	items: readonly BreadcrumbSegment[] | null;
	setItems: (items: readonly BreadcrumbSegment[] | null) => void;
	cta: React.ReactNode | null;
	setCta: (cta: React.ReactNode | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

/**
 * Guarda o breadcrumb e o CTA principal da página atual (registrados por `PageBreadcrumb`) pra
 * que o header mobile de `SidebarShell` saiba o título da página e qual botão de ação mostrar —
 * sem duplicar essa informação numa segunda fonte de verdade por página.
 */
export function PageHeaderProvider({ children }: { children: React.ReactNode }): React.ReactElement {
	const [items, setItemsState] = useState<readonly BreadcrumbSegment[] | null>(null);
	const [cta, setCtaState] = useState<React.ReactNode | null>(null);

	const setItems = useCallback((proximo: readonly BreadcrumbSegment[] | null) => {
		setItemsState(proximo);
	}, []);

	const setCta = useCallback((proximo: React.ReactNode | null) => {
		setCtaState(proximo);
	}, []);

	return <PageHeaderContext.Provider value={{ items, setItems, cta, setCta }}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeader(): PageHeaderContextValue {
	const context = useContext(PageHeaderContext);
	if (context === null) {
		throw new Error("usePageHeader precisa ser usado dentro de um PageHeaderProvider");
	}
	return context;
}
