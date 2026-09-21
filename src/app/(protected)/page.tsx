import Link from "next/link";
import { redirect } from "next/navigation";

import { ChecklistCustomizadoCard } from "@/components/checklist/ChecklistCustomizadoCard";
import { ChecklistMateriais } from "@/components/dashboard/ChecklistMateriais";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FinanceiroContent } from "@/components/dashboard/FinanceiroContent";
import { FunnelStageRow } from "@/components/dashboard/FunnelStageRow";
import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { VagoesChecklist } from "@/components/dashboard/VagoesChecklist";
import { VisaoGeralContent } from "@/components/dashboard/VisaoGeralContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/core/auth/getServerSession";
import { IDS_CHECKLISTS_SISTEMA, resumoChecklistComunicacao, resumoFechamentoMensal, resumoRitualFinanceiro } from "@/core/checklist/adaptadores";
import {
	buscarChecklistsCustomizados,
	buscarPreferenciasSistema,
	ordenarChecklists,
	resumoChecklistCustomizado,
} from "@/core/checklist/consultas";
import type { ChecklistItem, ChecklistResumo } from "@/core/checklist/schema";
import { buscarChecklistComunicacaoDoDia, chaveDia } from "@/core/comunicacao/checklist/consultas";
import { buscarItensMateriais } from "@/core/comunicacao/materiais/consultas";
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

	const [
		visaoGeral,
		financeiro,
		comunicacao,
		checklistComunicacao,
		ritualDaSemana,
		pendenciasAcionaveis,
		pendenciasHerdadas,
		fechamento,
		itensMateriais,
		preferenciasSistema,
		customizadosFinanceiro,
		customizadosComunicacao,
	] = await Promise.all([
		podeVerGeral ? montarVisaoGeral(firestore, agora) : null,
		podeVerFinanceiro ? montarKpisEPendenciasFinanceiro(firestore, agora) : null,
		podeVerComunicacao ? montarKpisEPendenciasComunicacao(firestore, agora) : null,
		podeVerComunicacao ? buscarChecklistComunicacaoDoDia(firestore, chaveDia(agora), agora) : null,
		podeVerFinanceiro ? buscarRitualDaSemana(firestore, chaveSemana(segundaFeiraDaSemana(agora))) : null,
		podeVerFinanceiro ? montarPendenciasAcionaveis(firestore, agora) : null,
		podeVerFinanceiro ? buscarPendenciasRitualHerdadas(firestore, agora) : null,
		podeVerFinanceiro ? buscarFechamentoDoMes(firestore, chavePeriodoDoMes(agora)) : null,
		podeVerComunicacao ? buscarItensMateriais(firestore) : null,
		podeVerFinanceiro || podeVerComunicacao ? buscarPreferenciasSistema(firestore, IDS_CHECKLISTS_SISTEMA) : null,
		podeVerFinanceiro ? buscarChecklistsCustomizados(firestore, "financeiro") : null,
		podeVerComunicacao ? buscarChecklistsCustomizados(firestore, "comunicacao") : null,
	]);

	// Ritual + Fechamento + customizados da área, ordenados por pin+score e sem os arquivados
	// (seção 3/5.1/6 de spec-checklist-motor.md) — motor genérico de checklist, não cobre Materiais.
	let checklistsFinanceiro: ChecklistResumo[] = [];
	let itensChecklistsCustomizadosFinanceiro: Record<string, ChecklistItem[]> = {};
	if (ritualDaSemana !== null && pendenciasAcionaveis !== null && fechamento !== null && customizadosFinanceiro !== null) {
		const resumoRitual = resumoRitualFinanceiro(ritualDaSemana, pendenciasAcionaveis, preferenciasSistema?.["financeiro-ritual"]);
		const resumoFechamento = resumoFechamentoMensal(fechamento, preferenciasSistema?.["financeiro-fechamento"]);
		const resumosCustomizados = customizadosFinanceiro.map(resumoChecklistCustomizado);
		checklistsFinanceiro = ordenarChecklists([resumoRitual, resumoFechamento, ...resumosCustomizados].filter((resumo) => !resumo.arquivado));
		customizadosFinanceiro.forEach((checklist) => {
			itensChecklistsCustomizadosFinanceiro[checklist.id] = checklist.itens;
		});
	}

	let checklistsComunicacao: ChecklistResumo[] = [];
	let itensChecklistsCustomizadosComunicacao: Record<string, ChecklistItem[]> = {};
	if (checklistComunicacao !== null && customizadosComunicacao !== null) {
		const resumoDia = resumoChecklistComunicacao(checklistComunicacao, preferenciasSistema?.["comunicacao-dia"]);
		const resumosCustomizados = customizadosComunicacao.map(resumoChecklistCustomizado);
		checklistsComunicacao = ordenarChecklists([resumoDia, ...resumosCustomizados].filter((resumo) => !resumo.arquivado));
		customizadosComunicacao.forEach((checklist) => {
			itensChecklistsCustomizadosComunicacao[checklist.id] = checklist.itens;
		});
	}

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

					{comunicacao !== null && checklistComunicacao !== null && itensMateriais !== null ? (
						<TabsContent value="comunicacao" className="mt-6 flex flex-col gap-6">
							<KpiCardsGrid items={comunicacao.kpis} />

							{/* Seção "Checklists" com fundo levemente diferente do resto da página, sem borda/sombra
							(item 2 da 5ª rodada de feedback). Mesmos dois bugs corrigidos em `FinanceiroContent.tsx`:
							`bg-muted/50` quase idêntico a `--background` (trocado por `bg-subtle`) e o box não fazia
							sangria até a borda da página (padding próprio somava com o da página, desalinhando o
							conteúdo) — agora sangra com margem negativa cancelando o padding responsivo do layout
							(`p-6 sm:p-8`) e reaplica o mesmo padding por dentro. */}
							<div className="-mx-6 flex flex-col gap-4 bg-subtle px-6 py-6 sm:-mx-8 sm:px-8">
								{/* Título de seção + "ver tudo", acima dos carrosséis (padrão Netflix/iFood) — item 4 do feedback
								de revisão: um único link pra área, não um por faixa (Materiais não tem link próprio). */}
								<div className="flex items-center justify-between gap-2">
									<h2 className="text-lg font-semibold text-foreground">Checklists</h2>
									<Link href="/checklists?aba=comunicacao" className="text-sm font-medium text-primary hover:underline">
										Ver todos os checklists →
									</Link>
								</div>

								{/* Materiais não implementa o contrato ChecklistResumo (spec-checklist-materiais.md), mas
								agora compartilha a mesma página de gestão `/checklists` (aba Comunicação, seção própria) —
								item 4 do feedback de revisão. */}
								<div className="flex flex-col gap-3">
									<h3 className="text-sm font-medium text-muted-foreground">Materiais</h3>
									<ChecklistMateriais itens={itensMateriais} />
								</div>

								<div className="flex flex-col gap-3">
									<h3 className="text-sm font-medium text-muted-foreground">Comunicação</h3>
									{/* Faixa rolável (mobile) / grade (desktop) de checklists — seção 5.1 da spec-checklist-motor.md. */}
									<div className="mr-[-1.5rem] flex snap-x snap-mandatory gap-4 overflow-x-auto pr-6 pb-2 sm:mr-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:pr-0 lg:grid-cols-3">
										{checklistsComunicacao.map((resumo) => (
											<div key={resumo.id} className="w-[85vw] shrink-0 snap-start sm:w-auto">
												{resumo.id === "comunicacao-dia" ? (
													<VagoesChecklist resumo={resumo} dia={chaveDia(agora)} checklist={checklistComunicacao} />
												) : (
													<ChecklistCustomizadoCard
														resumo={resumo}
														itens={itensChecklistsCustomizadosComunicacao[resumo.id] ?? []}
													/>
												)}
											</div>
										))}
									</div>
								</div>
							</div>

							<FunnelStageRow items={comunicacao.funil} />
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
								tendencia={financeiro.tendencia}
								recebidoPorTurma={financeiro.recebidoPorTurma}
								ritual={ritualDaSemana}
								pendenciasAcionaveis={pendenciasAcionaveis}
								pendenciasHerdadas={pendenciasHerdadas}
								fechamento={fechamento}
								checklistsFinanceiro={checklistsFinanceiro}
								itensChecklistsCustomizados={itensChecklistsCustomizadosFinanceiro}
							/>
						</TabsContent>
					) : null}
				</Tabs>
			)}
		</div>
	);
}
