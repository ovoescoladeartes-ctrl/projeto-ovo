"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { KpiCardData } from "@/core/dashboard/types";
import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import type { Repasse } from "@/core/financeiro/repasses/schema";

import { RecebimentosHistorico } from "./RecebimentosHistorico";
import { RepassesHistorico } from "./RepassesHistorico";

interface CaixaTabsProps {
	kpis: KpiCardData[];
	recebimentos: Recebimento[];
	repasses: Repasse[];
	pessoasNomes: Record<string, string>;
	turmasNomes: Record<string, string>;
}

/**
 * Aba controlada pelo searchParam `aba` (mesma rota, querystring diferente — padrão de
 * AbaAtivosArquivados) em vez de estado local: o CTA da aba ativa (Novo recebimento/Novo
 * repasse) mora no header, ao lado do H1, renderizado pelo Server Component `page.tsx` — só a
 * URL permite os dois lados saberem qual aba está ativa sem levantar estado por Context.
 */
export function CaixaTabs({ kpis, recebimentos, repasses, pessoasNomes, turmasNomes }: CaixaTabsProps): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const aba = searchParams.get("aba") === "repasses" ? "repasses" : "recebimentos";

	function mudarAba(valor: string): void {
		const params = new URLSearchParams(searchParams.toString());
		if (valor === "repasses") {
			params.set("aba", "repasses");
		} else {
			params.delete("aba");
		}
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	return (
		<Tabs value={aba} onValueChange={mudarAba}>
			<TabsList className="bg-transparent p-0">
				<TabsTrigger
					value="recebimentos"
					className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
				>
					Recebimentos
				</TabsTrigger>
				<TabsTrigger
					value="repasses"
					className="ml-6 rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
				>
					Repasses
				</TabsTrigger>
			</TabsList>

			{/* Resumo compartilhado pelas duas abas — fica logo abaixo da TabsList, não dentro de um
			    TabsContent específico, senão sumiria ao trocar de aba. */}
			<div className="mt-6">
				<KpiCardsGrid items={kpis} />
			</div>

			<TabsContent value="recebimentos" className="mt-6 space-y-4">
				<RecebimentosHistorico recebimentos={recebimentos} pessoasNomes={pessoasNomes} turmasNomes={turmasNomes} />
			</TabsContent>

			<TabsContent value="repasses" className="mt-6 space-y-4">
				<RepassesHistorico repasses={repasses} pessoasNomes={pessoasNomes} turmasNomes={turmasNomes} />
			</TabsContent>
		</Tabs>
	);
}
