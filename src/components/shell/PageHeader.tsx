import { GlobalSearchTrigger } from "./GlobalSearchTrigger";
import { PageBreadcrumb, type BreadcrumbSegment } from "./PageBreadcrumb";

interface PageHeaderProps {
	/**
	 * Omitido só na Dashboard — as demais rotas sempre têm breadcrumb. Quando omitido,
	 * `PageBreadcrumb` nem é montado: é o `useEffect` dela que registra `items` no contexto pro
	 * `MobileHeader` saber se está na Dashboard (`items === null`) — não dá pra simular isso
	 * passando um array vazio.
	 */
	breadcrumb?: readonly BreadcrumbSegment[];
	title: string;
	/**
	 * Data da Dashboard (`align="center"`, ocupa o lugar do CTA — a Dashboard não tem um), ou
	 * "Arquivado"/e-mail·telefone empilhado sob o título na ficha de Pessoa (`align="start"`).
	 */
	subtitle?: React.ReactNode;
	/** Badges abaixo do subtítulo (interesses da ficha de Pessoa) — só usado com `align="start"`. */
	extra?: React.ReactNode;
	cta?: React.ReactNode;
	/** Ficha de Pessoa usa alinhamento pelo topo (subtítulo/badges multi-linha); todo o resto usa centralizado (default). */
	align?: "center" | "start";
	/**
	 * A Dashboard já vive dentro de um `flex flex-col gap-6` que espaça os irmãos — sem isso, o
	 * `mb-6` próprio do header somaria com o `gap-6` do pai e dobraria o espaço.
	 */
	spacing?: boolean;
}

/**
 * Header padrão de página interna (regra 15 do design.md): Breadcrumb → H1 + busca global + CTA.
 * Substitui a combinação de `PageBreadcrumb` + bloco de título remontado à mão que cada página
 * tinha antes — continua usando `PageBreadcrumb` por baixo (não duplica o registro de
 * `items`/`cta` no contexto que `MobileHeader` de `SidebarShell` depende). A busca global fica
 * sempre centralizada na coluna do meio, a partir de `md` (abaixo disso o gatilho é o ícone de
 * `MobileHeader`) — busca/filtro específico de alguma página (Pessoas, Turmas) não mora mais
 * aqui, desceu pra linha de filtros abaixo do header.
 */
export function PageHeader({
	breadcrumb,
	title,
	subtitle,
	extra,
	cta,
	align = "center",
	spacing = true,
}: PageHeaderProps): React.ReactElement {
	// Escondido no mobile porque já vive lá via `MobileHeader` (registrado por `PageBreadcrumb` no
	// contexto de `usePageHeader`) — sem isso o botão aparecia duas vezes. `subtitle` não é um botão
	// (é a data da Dashboard, texto puro) e não tem essa duplicação: fica sempre visível.
	const ctaBlock = <div className="hidden items-center gap-2 md:flex">{cta}</div>;

	return (
		<div>
			{breadcrumb !== undefined ? <PageBreadcrumb items={breadcrumb} cta={cta} /> : null}

			<div
				className={`grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] ${align === "start" ? "items-start" : "items-center"} ${
					spacing ? "mb-6 mt-2" : ""
				}`}
			>
				{align === "start" ? (
					<div className="min-w-0 space-y-4">
						<div>
							<h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
							{subtitle}
						</div>
						{extra}
					</div>
				) : (
					<h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
				)}

				<div className="hidden md:flex md:justify-center">
					<GlobalSearchTrigger className="min-w-[500px] max-w-xl" />
				</div>

				<div className="justify-self-end">{align === "start" ? ctaBlock : cta !== undefined ? ctaBlock : subtitle}</div>
			</div>
		</div>
	);
}
