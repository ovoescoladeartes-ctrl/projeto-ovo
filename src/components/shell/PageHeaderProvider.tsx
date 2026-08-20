"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import type { BreadcrumbSegment } from "./PageBreadcrumb";

interface PageHeaderContextValue {
	items: readonly BreadcrumbSegment[] | null;
	setItems: (items: readonly BreadcrumbSegment[] | null) => void;
	cta: React.ReactNode | null;
	setCta: (cta: React.ReactNode | null) => void;
	/** true assim que pelo menos uma navegação client-side aconteceu desde que o app carregou —
	 * só nesse caso `router.back()` é seguro (senão pode sair do app por falta de histórico). */
	canGoBack: boolean;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

/**
 * Guarda o breadcrumb e o CTA principal da página atual (registrados por `PageBreadcrumb`) pra
 * que o header mobile de `SidebarShell` saiba o título da página, se existe um pai navegável, e
 * qual botão de ação mostrar — sem duplicar essa informação numa segunda fonte de verdade por
 * página.
 */
export function PageHeaderProvider({ children }: { children: React.ReactNode }): React.ReactElement {
	const [items, setItemsState] = useState<readonly BreadcrumbSegment[] | null>(null);
	const [cta, setCtaState] = useState<React.ReactNode | null>(null);
	const [canGoBack, setCanGoBack] = useState(false);
	const primeiraRota = useRef(true);
	const pathname = usePathname();

	useEffect(() => {
		if (primeiraRota.current) {
			primeiraRota.current = false;
			return;
		}
		setCanGoBack(true);
	}, [pathname]);

	const setItems = useCallback((proximo: readonly BreadcrumbSegment[] | null) => {
		setItemsState(proximo);
	}, []);

	const setCta = useCallback((proximo: React.ReactNode | null) => {
		setCtaState(proximo);
	}, []);

	return (
		<PageHeaderContext.Provider value={{ items, setItems, cta, setCta, canGoBack }}>{children}</PageHeaderContext.Provider>
	);
}

export function usePageHeader(): PageHeaderContextValue {
	const context = useContext(PageHeaderContext);
	if (context === null) {
		throw new Error("usePageHeader precisa ser usado dentro de um PageHeaderProvider");
	}
	return context;
}
