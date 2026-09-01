"use client";

import { usePathname, useSearchParams } from "next/navigation";

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface ListagemPaginacaoProps {
	paginaAtual: number;
	totalPaginas: number;
	totalItens: number;
	itensPorPagina: number;
}

function paginasVisiveis(paginaAtual: number, totalPaginas: number): (number | "ellipsis")[] {
	if (totalPaginas <= 7) {
		return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);
	}
	const paginas = new Set<number>([1, totalPaginas, paginaAtual - 1, paginaAtual, paginaAtual + 1]);
	const ordenadas = Array.from(paginas)
		.filter((pagina) => pagina >= 1 && pagina <= totalPaginas)
		.sort((a, b) => a - b);
	const resultado: (number | "ellipsis")[] = [];
	ordenadas.forEach((pagina, index) => {
		const anterior = ordenadas[index - 1];
		if (index > 0 && anterior !== undefined && pagina - anterior > 1) {
			resultado.push("ellipsis");
		}
		resultado.push(pagina);
	});
	return resultado;
}

/**
 * Paginação numérica ("Mostrando X–Y de N") — genérica, compartilhada por toda listagem que traz
 * a query inteira pra memória e só faz um slice do array já filtrado/ordenado no servidor (ver
 * `pessoas/page.tsx`/`pessoas/turmas/page.tsx`). Página fora do range nunca é passada aqui — quem
 * chama já clampa `paginaAtual` entre 1 e `totalPaginas`.
 */
export function ListagemPaginacao({
	paginaAtual,
	totalPaginas,
	totalItens,
	itensPorPagina,
}: ListagemPaginacaoProps): React.ReactElement | null {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	if (totalItens === 0) {
		return null;
	}

	function hrefParaPagina(pagina: number): string {
		const params = new URLSearchParams(searchParams.toString());
		if (pagina <= 1) {
			params.delete("pagina");
		} else {
			params.set("pagina", String(pagina));
		}
		const query = params.toString();
		return query.length > 0 ? `${pathname}?${query}` : pathname;
	}

	const inicio = (paginaAtual - 1) * itensPorPagina + 1;
	const fim = Math.min(paginaAtual * itensPorPagina, totalItens);

	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<p className="text-sm text-muted-foreground">
				Mostrando {inicio}–{fim} de {totalItens}
			</p>
			{totalPaginas > 1 ? (
				<Pagination className="mx-0 w-auto justify-end">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href={hrefParaPagina(Math.max(1, paginaAtual - 1))}
								className={paginaAtual === 1 ? "pointer-events-none opacity-50" : ""}
							/>
						</PaginationItem>
						{paginasVisiveis(paginaAtual, totalPaginas).map((pagina, index) =>
							pagina === "ellipsis" ? (
								<PaginationItem key={`ellipsis-${index}`}>
									<PaginationEllipsis />
								</PaginationItem>
							) : (
								<PaginationItem key={pagina}>
									<PaginationLink href={hrefParaPagina(pagina)} isActive={pagina === paginaAtual}>
										{pagina}
									</PaginationLink>
								</PaginationItem>
							),
						)}
						<PaginationItem>
							<PaginationNext
								href={hrefParaPagina(Math.min(totalPaginas, paginaAtual + 1))}
								className={paginaAtual === totalPaginas ? "pointer-events-none opacity-50" : ""}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			) : null}
		</div>
	);
}
