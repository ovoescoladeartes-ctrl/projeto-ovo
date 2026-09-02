import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FinanceiroContent } from "@/components/dashboard/FinanceiroContent";
import { FunnelStageRow } from "@/components/dashboard/FunnelStageRow";
import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { PendenciasList } from "@/components/dashboard/PendenciasList";
import { VagoesChecklist } from "@/components/dashboard/VagoesChecklist";
import { VisaoGeralContent } from "@/components/dashboard/VisaoGeralContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/core/auth/getServerSession";
import { buscarChecklistComunicacaoDoDia, chaveDia } from "@/core/comunicacao/checklist/consultas";
import {
	CAIXA_ROLES,
	GERAL_ROLES,
	montarKpisEPendenciasComunicacao,
	montarKpisEPendenciasFinanceiro,
	VAGOES_ROLES,
} from "@/core/dashboard/consultas";
import { montarVisaoGeral } from "@/core/dashboard/visaoGeral";
import { buscarFechamentoDoMes, chavePeriodoDoMes } from "@/core/financeiro/fechamento/consultas";
import { montarPendenciasAcionaveis } from "@/core/financeiro/pendencias/consultas";
import { buscarPendenciasRitualHerdadas, buscarRitualDaSemana, chaveSemana, segundaFeiraDaSemana } from "@/core/financeiro/ritual/consultas";
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

	const [visaoGeral, financeiro, comunicacao, checklistComunicacao, ritualDaSemana, pendenciasAcionaveis, pendenciasHerdadas, fechamento] =
		await Promise.all([
			podeVerGeral ? montarVisaoGeral(firestore, agora) : null,
			podeVerFinanceiro ? montarKpisEPendenciasFinanceiro(firestore, agora) : null,
			podeVerComunicacao ? montarKpisEPendenciasComunicacao(firestore, agora) : null,
			podeVerComunicacao ? buscarChecklistComunicacaoDoDia(firestore, chaveDia(agora), agora) : null,
			podeVerFinanceiro ? buscarRitualDaSemana(firestore, chaveSemana(segundaFeiraDaSemana(agora))) : null,
			podeVerFinanceiro ? montarPendenciasAcionaveis(firestore, agora) : null,
			podeVerFinanceiro ? buscarPendenciasRitualHerdadas(firestore, agora) : null,
			podeVerFinanceiro ? buscarFechamentoDoMes(firestore, chavePeriodoDoMes(agora)) : null,
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

					{comunicacao !== null && checklistComunicacao !== null ? (
						<TabsContent value="comunicacao" className="mt-6 flex flex-col gap-6">
							<KpiCardsGrid items={comunicacao.kpis} />
							<VagoesChecklist dia={chaveDia(agora)} checklist={checklistComunicacao} />
							<FunnelStageRow items={comunicacao.funil} />
							<PendenciasList items={comunicacao.pendencias} />
						</TabsContent>
					) : null}

					{financeiro !== null &&
					ritualDaSemana !== null &&
					pendenciasAcionaveis !== null &&
					pendenciasHerdadas !== null &&
					fechamento !== null ? (
						<TabsContent value="financeiro" className="mt-6 flex flex-col gap-6">
							<FinanceiroContent
								kpis={financeiro.kpis}
								pendencias={financeiro.pendencias}
								tendencia={financeiro.tendencia}
								recebidoPorTurma={financeiro.recebidoPorTurma}
								ritual={ritualDaSemana}
								pendenciasAcionaveis={pendenciasAcionaveis}
								pendenciasHerdadas={pendenciasHerdadas}
								fechamento={fechamento}
							/>
						</TabsContent>
					) : null}
				</Tabs>
			)}
		</div>
	);
}
