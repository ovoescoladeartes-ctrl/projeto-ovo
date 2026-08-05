"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import type { Repasse } from "@/core/financeiro/repasses/schema";

import { NovoRecebimentoDialog } from "./NovoRecebimentoDialog";
import { NovoRepasseDialog } from "./NovoRepasseDialog";
import { RecebimentosHistorico } from "./RecebimentosHistorico";
import { RepassesHistorico } from "./RepassesHistorico";

interface TurmaOpcao {
	id: string;
	nome: string;
}

interface CaixaTabsProps {
	recebimentos: Recebimento[];
	repasses: Repasse[];
	pessoasNomes: Record<string, string>;
	turmasNomes: Record<string, string>;
	turmasAtivas: TurmaOpcao[];
}

export function CaixaTabs({
	recebimentos,
	repasses,
	pessoasNomes,
	turmasNomes,
	turmasAtivas,
}: CaixaTabsProps): React.ReactElement {
	return (
		<Tabs defaultValue="recebimentos">
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

			<TabsContent value="recebimentos" className="mt-6 space-y-4">
				<div className="flex justify-end">
					<NovoRecebimentoDialog turmas={turmasAtivas} />
				</div>
				<RecebimentosHistorico recebimentos={recebimentos} pessoasNomes={pessoasNomes} turmasNomes={turmasNomes} />
			</TabsContent>

			<TabsContent value="repasses" className="mt-6 space-y-4">
				<div className="flex justify-end">
					<NovoRepasseDialog turmas={turmasAtivas} />
				</div>
				<RepassesHistorico repasses={repasses} pessoasNomes={pessoasNomes} turmasNomes={turmasNomes} />
			</TabsContent>
		</Tabs>
	);
}
