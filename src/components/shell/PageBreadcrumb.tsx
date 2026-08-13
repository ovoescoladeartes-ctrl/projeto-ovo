import { Fragment } from "react";

import Link from "next/link";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbSegment {
	label: string;
	/** Ausente => segmento não navegável (ex.: rótulo de grupo da sidebar sem rota própria). */
	href?: string;
}

interface PageBreadcrumbProps {
	items: readonly BreadcrumbSegment[];
}

export function PageBreadcrumb({ items }: PageBreadcrumbProps): React.ReactElement {
	return (
		<Breadcrumb>
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
