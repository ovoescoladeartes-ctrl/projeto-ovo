import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderSkeletonProps {
	/** Dashboard é a única rota sem `PageBreadcrumb` (regra 12 de docs/design.md). */
	breadcrumb?: boolean;
	/** Ficha de Pessoa usa alinhamento pelo topo (subtítulo/badges multi-linha) — espelha a prop `align` de `PageHeader`. */
	align?: "center" | "start";
	/** Botão de ação no canto direito (a maioria das rotas). */
	cta?: boolean;
	/** Texto no lugar do CTA (a data da Dashboard) — sempre visível, sem o `hidden md:` do CTA (não é botão, não duplica no mobile). Ignorado se `cta` estiver ligado. */
	subtitle?: boolean;
	/** Badges abaixo do subtítulo — só com `align="start"` (interesses da ficha de Pessoa). */
	badges?: boolean;
	/** A Dashboard já vive dentro de um `gap-6` que espaça os irmãos — evita somar com o `mb-6` próprio do header. */
	spacing?: boolean;
	/** Bloco de Tabs logo abaixo do header (Comunicação/Financeiro, Recebimentos/Repasses). */
	tabs?: boolean;
}

/**
 * Esqueleto do cabeçalho padrão de página interna (regra 15 de docs/design.md):
 * Breadcrumb → H1 + busca global centralizada + CTA. A busca é sempre centralizada e com pelo
 * menos ~500px a partir de `md` (espelha `GlobalSearchTrigger` dentro de `PageHeader`) — não é
 * mais opcional por página: isso mudou quando a busca própria de Pessoas/Turmas desceu pra linha
 * de filtros abaixo do header (ver `pessoas/loading.tsx`, `pessoas/turmas/loading.tsx`).
 */
export function PageHeaderSkeleton({
	breadcrumb = true,
	align = "center",
	cta = true,
	subtitle = false,
	badges = false,
	spacing = true,
	tabs = false,
}: PageHeaderSkeletonProps): React.ReactElement {
	return (
		<div>
			{breadcrumb ? <Skeleton className="mb-2 h-4 w-48" /> : null}

			<div
				className={`grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] ${align === "start" ? "items-start" : "items-center"} ${
					spacing ? "mb-6 mt-2" : ""
				}`}
			>
				{align === "start" ? (
					<div className="min-w-0 space-y-4">
						<div className="space-y-2">
							<Skeleton className="h-8 w-56 sm:h-9" />
							<Skeleton className="h-4 w-40" />
						</div>
						{badges ? (
							<div className="flex gap-1.5">
								<Skeleton className="h-5 w-16 rounded-full" />
								<Skeleton className="h-5 w-20 rounded-full" />
							</div>
						) : null}
					</div>
				) : (
					<Skeleton className="h-8 w-40 sm:h-9" />
				)}

				<div className="hidden md:flex md:justify-center">
					<Skeleton className="h-9 min-w-[500px] max-w-xl" />
				</div>

				<div className="justify-self-end">
					{cta ? <Skeleton className="hidden h-9 w-28 shrink-0 md:block" /> : subtitle ? <Skeleton className="h-4 w-24" /> : null}
				</div>
			</div>

			{tabs ? (
				<div className="mb-6 flex gap-6 border-b border-border pb-2">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-24" />
				</div>
			) : null}
		</div>
	);
}
