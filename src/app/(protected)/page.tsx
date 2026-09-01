import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FinanceiroContent } from "@/components/dashboard/FinanceiroContent";
import { FunnelStageRow } from "@/components/dashboard/FunnelStageRow";
import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { PendenciasList } from "@/components/dashboard/PendenciasList";
import { VisaoGeralContent } from "@/components/dashboard/VisaoGeralContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/core/auth/getServerSession";
import {
	CAIXA_ROLES,
	GERAL_ROLES,
	montarKpisEPendenciasComunicacao,
	montarKpisEPendenciasFinanceiro,
	VAGOES_ROLES,
} from "@/core/dashboard/consultas";
import { montarVisaoGeral } from "@/core/dashboard/visaoGeral";
import { buscarRitualDaSemana, chaveSemana, segundaFeiraDaSemana } from "@/core/financeiro/ritual/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { cn } from "@/lib/utils";

export default async function HomePage(): Promise<React.ReactElement> {
	const session = await getServerSession();
	if (session === null) {
		redirect("/login");
	}

	const podeVerGeral = GERAL_ROLES.includes(session.role);
	const podeVerFinanceiro = CAIXA_ROLES.includes(session.role);
	const podeVerComunicacao = VAGOES_ROLES.includes(session.role);
	const agora = new Date();
	const firestore = getFirebaseAdminFirestore();

	const [visaoGeral, financeiro, comunicacao, ritualDaSemana] = await Promise.all([
		podeVerGeral ? montarVisaoGeral(firestore, agora) : null,
		podeVerFinanceiro ? montarKpisEPendenciasFinanceiro(firestore, agora) : null,
		podeVerComunicacao ? montarKpisEPendenciasComunicacao(firestore, agora) : null,
		podeVerFinanceiro ? buscarRitualDaSemana(firestore, chaveSemana(segundaFeiraDaSemana(agora))) : null,
	]);

	const abaPadrao = podeVerGeral ? "geral" : podeVerFinanceiro ? "financeiro" : "comunicacao";

	return (
		<div className="flex flex-col gap-6">
			<DashboardHeader />

			{!podeVerGeral && !podeVerComunicacao && !podeVerFinanceiro ? (
				<p className="text-sm text-muted-foreground">Nenhum dado de dashboard disponível para o seu perfil ainda.</p>
			) : (
				<Tabs defaultValue={abaPadrao}>
					<TabsList className="bg-transparent p-0">
						{podeVerGeral ? (
							<TabsTrigger
								value="geral"
								className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
							>
								Geral
							</TabsTrigger>
						) : null}
						{podeVerFinanceiro ? (
							<TabsTrigger
								value="financeiro"
								className={cn(
									"rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none",
									podeVerGeral && "ml-6",
								)}
							>
								Financeiro
							</TabsTrigger>
						) : null}
						{podeVerComunicacao ? (
							<TabsTrigger
								value="comunicacao"
								className={cn(
									"rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none",
									(podeVerGeral || podeVerFinanceiro) && "ml-6",
								)}
							>
								Comunicação
							</TabsTrigger>
						) : null}
					</TabsList>

					{visaoGeral !== null ? (
						<TabsContent value="geral" className="mt-6 flex flex-col gap-6">
							<VisaoGeralContent dados={visaoGeral} />
						</TabsContent>
					) : null}

					{comunicacao !== null ? (
						<TabsContent value="comunicacao" className="mt-6 flex flex-col gap-6">
							<KpiCardsGrid items={comunicacao.kpis} />
							<FunnelStageRow items={comunicacao.funil} />
							<PendenciasList items={comunicacao.pendencias} />
						</TabsContent>
					) : null}

					{financeiro !== null && ritualDaSemana !== null ? (
						<TabsContent value="financeiro" className="mt-6 flex flex-col gap-6">
							<FinanceiroContent
								kpis={financeiro.kpis}
								pendencias={financeiro.pendencias}
								tendencia={financeiro.tendencia}
								recebidoPorTurma={financeiro.recebidoPorTurma}
								ritual={ritualDaSemana}
							/>
						</TabsContent>
					) : null}
				</Tabs>
			)}
		</div>
	);
}
