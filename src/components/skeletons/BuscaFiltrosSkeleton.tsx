import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto do campo de busca + botão "Filtros" — no lugar de `PessoasBuscaEFiltros`/`TurmasBuscaEFiltros`, que hoje vivem na linha de filtros abaixo do header (ao lado de `AbaAtivosArquivados`), não mais dentro do header. */
export function BuscaFiltrosSkeleton(): React.ReactElement {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Skeleton className="h-9 w-full sm:w-80" />
			<Skeleton className="h-9 w-24" />
		</div>
	);
}
