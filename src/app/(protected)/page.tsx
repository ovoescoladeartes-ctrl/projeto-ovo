import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FunnelStageRow } from "@/components/dashboard/FunnelStageRow";
import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { PendenciasList } from "@/components/dashboard/PendenciasList";
import { RitualChecklist } from "@/components/dashboard/RitualChecklist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	mockAlertaCobranca,
	mockFunnelStages,
	mockKpisComunicacao,
	mockKpisFinanceiro,
	mockPendenciasComunicacao,
	mockPendenciasFinanceiro,
	mockRitualChecklist,
} from "@/core/dashboard/mockData";

export default function HomePage(): React.ReactElement {
	return (
		<div className="flex flex-col gap-6">
			<DashboardHeader />

			<Tabs defaultValue="comunicacao">
				<TabsList className="bg-transparent p-0">
					<TabsTrigger
						value="comunicacao"
						className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
					>
						Comunicação
					</TabsTrigger>
					<TabsTrigger
						value="financeiro"
						className="ml-6 rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
					>
						Financeiro
					</TabsTrigger>
				</TabsList>

				<TabsContent value="comunicacao" className="mt-6 flex flex-col gap-6">
					<AlertBanner mensagem={mockAlertaCobranca.mensagem} variant="destructive" />
					<KpiCardsGrid items={mockKpisComunicacao} />
					<FunnelStageRow items={mockFunnelStages} />
					<PendenciasList items={mockPendenciasComunicacao} />
				</TabsContent>

				<TabsContent value="financeiro" className="mt-6 flex flex-col gap-6">
					<AlertBanner mensagem={mockAlertaCobranca.mensagem} variant="destructive" />
					<KpiCardsGrid items={mockKpisFinanceiro} />
					<RitualChecklist items={mockRitualChecklist} />
					<PendenciasList items={mockPendenciasFinanceiro} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
