"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Abas Ativos/Arquivados controladas pelo searchParam `arquivados` (mesma rota, querystring
 * diferente) — variante sublinhada, regra MANDATÓRIA nº 7 de docs/design.md, mesma usada em
 * Dashboard/Vagões. Compartilhada entre Pessoas e Turmas.
 */
export function AbaAtivosArquivados(): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const aba = searchParams.get("arquivados") === "1" ? "arquivados" : "ativos";

	function mudarAba(valor: string): void {
		const params = new URLSearchParams(searchParams.toString());
		if (valor === "arquivados") {
			params.set("arquivados", "1");
		} else {
			params.delete("arquivados");
		}
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	return (
		<Tabs value={aba} onValueChange={mudarAba}>
			<TabsList className="bg-transparent p-0">
				<TabsTrigger
					value="ativos"
					className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
				>
					Ativas
				</TabsTrigger>
				<TabsTrigger
					value="arquivados"
					className="ml-6 rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
				>
					Arquivadas
				</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}
