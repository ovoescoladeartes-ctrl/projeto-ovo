import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FunnelStageRow } from "@/components/dashboard/FunnelStageRow";
import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { PendenciasList } from "@/components/dashboard/PendenciasList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/core/auth/getServerSession";
import {
	CAIXA_ROLES,
	montarKpisEPendenciasComunicacao,
	montarKpisEPendenciasFinanceiro,
	VAGOES_ROLES,
} from "@/core/dashboard/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { cn } from "@/lib/utils";

export default async function HomePage(): Promise<React.ReactElement> {
	const session = await getServerSession();
	if (session === null) {
		redirect("/login");
	}

	const podeVerFinanceiro = CAIXA_ROLES.includes(session.role);
	const podeVerComunicacao = VAGOES_ROLES.includes(session.role);
	const agora = new Date();
	const firestore = getFirebaseAdminFirestore();

	const [financeiro, comunicacao] = await Promise.all([
		podeVerFinanceiro ? montarKpisEPendenciasFinanceiro(firestore, agora) : null,
		podeVerComunicacao ? montarKpisEPendenciasComunicacao(firestore, agora) : null,
	]);

	const abaPadrao = podeVerFinanceiro ? "financeiro" : "comunicacao";

	return (
		<div className="flex flex-col gap-6">
			<DashboardHeader />

			{!podeVerComunicacao && !podeVerFinanceiro ? (
				<p className="text-sm text-muted-foreground">Nenhum dado de dashboard disponível para o seu perfil ainda.</p>
			) : (
				<Tabs defaultValue={abaPadrao}>
					<TabsList className="bg-transparent p-0">
						{podeVerFinanceiro ? (
							<TabsTrigger
								value="financeiro"
								className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
							>
								Financeiro
							</TabsTrigger>
						) : null}
						{podeVerComunicacao ? (
							<TabsTrigger
								value="comunicacao"
								className={cn(
									"rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none",
									podeVerFinanceiro && "ml-6",
								)}
							>
								Comunicação
							</TabsTrigger>
						) : null}
					</TabsList>

					{comunicacao !== null ? (
						<TabsContent value="comunicacao" className="mt-6 flex flex-col gap-6">
							<KpiCardsGrid items={comunicacao.kpis} />
							<FunnelStageRow items={comunicacao.funil} />
							<PendenciasList items={comunicacao.pendencias} />
						</TabsContent>
					) : null}

					{financeiro !== null ? (
						<TabsContent value="financeiro" className="mt-6 flex flex-col gap-6">
							<KpiCardsGrid items={financeiro.kpis} />
							<PendenciasList items={financeiro.pendencias} />
						</TabsContent>
					) : null}
				</Tabs>
			)}
		</div>
	);
}
