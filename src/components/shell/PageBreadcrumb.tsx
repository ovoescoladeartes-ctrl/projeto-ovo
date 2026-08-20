"use client";

import { Fragment, useEffect } from "react";

import Link from "next/link";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { usePageHeader } from "./PageHeaderProvider";

export interface BreadcrumbSegment {
	label: string;
	/** Ausente => segmento não navegável (ex.: rótulo de grupo da sidebar sem rota própria). */
	href?: string;
}

interface PageBreadcrumbProps {
	items: readonly BreadcrumbSegment[];
	/** CTA principal da página (ex. "Nova pessoa") — some no header mobile ao lado do título. */
	cta?: React.ReactNode;
}

export function PageBreadcrumb({ items, cta }: PageBreadcrumbProps): React.ReactElement {
	const { setItems, setCta } = usePageHeader();

	// Registra o trail e o CTA atuais pro header mobile (`SidebarShell`) saber o título da
	// página, se há um pai navegável, e qual botão de ação mostrar — sem isso o header mobile
	// precisaria de uma segunda fonte pra cada um desses dados.
	useEffect(() => {
		setItems(items);
		setCta(cta ?? null);
		return () => {
			setItems(null);
			setCta(null);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(items), cta]);

	return (
		<Breadcrumb className="hidden md:block">
			<BreadcrumbList>
				{items.map((item, index) => {
					const isLast = index === items.length - 1;

					return (
						<Fragment key={item.label}>
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage>{item.label}</BreadcrumbPage>
								) : item.href !== undefined ? (
									<BreadcrumbLink asChild>
										<Link href={item.href}>{item.label}</Link>
									</BreadcrumbLink>
								) : (
									<span>{item.label}</span>
								)}
							</BreadcrumbItem>
							{!isLast && <BreadcrumbSeparator />}
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
