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
import { ordenarChecklists, resumoChecklistCustomizado } from "@/core/checklist/consultas";
import type { ChecklistItem, ChecklistResumo } from "@/core/checklist/schema";
import { contarAguardandoPorUrgencia } from "@/core/comunicacao/pendencias";
import {
	CAIXA_ROLES,
	GERAL_ROLES,
	montarKpisEPendenciasComunicacao,
	montarKpisEPendenciasFinanceiro,
	VAGOES_ROLES,
} from "@/core/dashboard/consultas";
import { montarVisaoGeral } from "@/core/dashboard/visaoGeral";
import { lerChecklistsCustomizados } from "@/core/db/checklistsCustomizados";
import { lerPreferenciasSistema } from "@/core/db/checklistsPreferencias";
import { lerContatosAtivos } from "@/core/db/contatos";
import { lerItensMateriais } from "@/core/db/materiais";
import { lerMatriculas } from "@/core/db/matriculas";
import { lerPendenciasManuaisAbertas } from "@/core/db/pendenciasManuais";
import { lerPessoas } from "@/core/db/pessoas";
import { lerRecebimentos } from "@/core/db/recebimentos";
import { lerRepasses } from "@/core/db/repasses";
import { lerTurmas } from "@/core/db/turmas";
import { buscarFechamentoDoMes, chavePeriodoDoMes } from "@/core/financeiro/fechamento/consultas";
import { montarPendenciasAcionaveis } from "@/core/financeiro/pendencias/consultas";
import { buscarPendenciasRitualHerdadas, buscarRitualDaSemana, chaveSemana, segundaFeiraDaSemana } from "@/core/financeiro/ritual/consultas";
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

	// Leituras cacheadas (src/core/db/) — uma por coleção, ainda gated por role, com cache quente
	// valendo ~0 leitura no Firestore. `pessoas`/`turmas` servem tanto a aba Geral quanto a
	// Financeiro (e o seletor de turma do card de Materiais); `contatos` serve tanto os KPIs de
	// Comunicação quanto o Checklist do Dia — cada consumidor filtra/agrega o que precisa a partir
	// do mesmo array, sem reler a coleção.
	const [
		pessoas,
		turmas,
		matriculas,
		recebimentos,
		repasses,
		contatosAtivos,
		pendenciasManuaisAbertas,
		itensMateriais,
		preferenciasSistema,
		customizadosFinanceiro,
		customizadosComunicacao,
	] = await Promise.all([
		podeVerGeral || podeVerFinanceiro ? lerPessoas() : Promise.resolve([]),
		podeVerGeral || podeVerFinanceiro || podeVerComunicacao ? lerTurmas() : Promise.resolve([]),
		podeVerGeral ? lerMatriculas() : Promise.resolve([]),
		podeVerFinanceiro ? lerRecebimentos() : Promise.resolve([]),
		podeVerFinanceiro ? lerRepasses() : Promise.resolve([]),
		podeVerComunicacao ? lerContatosAtivos() : Promise.resolve([]),
		podeVerFinanceiro ? lerPendenciasManuaisAbertas() : Promise.resolve([]),
		podeVerComunicacao ? lerItensMateriais() : Promise.resolve([]),
		podeVerFinanceiro || podeVerComunicacao ? lerPreferenciasSistema(IDS_CHECKLISTS_SISTEMA) : null,
		podeVerFinanceiro ? lerChecklistsCustomizados("financeiro") : null,
		podeVerComunicacao ? lerChecklistsCustomizados("comunicacao") : null,
	]);

	const visaoGeral = podeVerGeral ? montarVisaoGeral({ turmas, matriculas, pessoas }, agora) : null;
	const financeiro = podeVerFinanceiro ? montarKpisEPendenciasFinanceiro({ recebimentos, repasses, turmas }, agora) : null;
	const comunicacao = podeVerComunicacao ? montarKpisEPendenciasComunicacao(contatosAtivos, agora) : null;
	const pendenciasAcionaveis = podeVerFinanceiro
		? montarPendenciasAcionaveis({ repasses, recebimentos, pessoas, pendenciasManuais: pendenciasManuaisAbertas }, agora)
		: null;

	// Fase 2 do plano de redução de leituras: doc-gets por chave (semana/mês) do Ritual e
	// Fechamento, via repositório cacheado (`src/core/db/`). O Checklist do Dia não lê doc próprio —
	// é só a contagem agregada dos contatos já lidos acima.
	const [ritualDaSemana, pendenciasHerdadas, fechamento] = await Promise.all([
		podeVerFinanceiro ? buscarRitualDaSemana(chaveSemana(segundaFeiraDaSemana(agora))) : null,
		podeVerFinanceiro ? buscarPendenciasRitualHerdadas(agora) : null,
		podeVerFinanceiro ? buscarFechamentoDoMes(chavePeriodoDoMes(agora)) : null,
	]);

	const aguardandoResposta = podeVerComunicacao ? contarAguardandoPorUrgencia(contatosAtivos, agora) : null;

	// Turmas ativas pro seletor de "Adicionar material" (item 3 da 8ª rodada de feedback) — mesmo
	// array já lido pra `montarVisaoGeral`/`montarKpisEPendenciasFinanceiro`, só filtrado em memória.
	const turmasAtivas = turmas
		.filter((turma) => turma.ativo)
		.map((turma) => ({ id: turma.id, nome: turma.nome }))
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	// Ritual + Fechamento + customizados da área, ordenados por pin+score e sem os arquivados
	// (seção 3/5.1/6 de spec-checklist-motor.md) — motor genérico de checklist, não cobre Materiais.
	let checklistsFinanceiro: ChecklistResumo[] = [];
	const itensChecklistsCustomizadosFinanceiro: Record<string, ChecklistItem[]> = {};
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
	const itensChecklistsCustomizadosComunicacao: Record<string, ChecklistItem[]> = {};
	if (aguardandoResposta !== null && customizadosComunicacao !== null) {
		const resumoDia = resumoChecklistComunicacao(aguardandoResposta, preferenciasSistema?.["comunicacao-dia"]);
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

					{comunicacao !== null && aguardandoResposta !== null && itensMateriais !== null ? (
						<TabsContent value="comunicacao" className="mt-6 flex flex-col gap-6">
							<KpiCardsGrid items={comunicacao.kpis} />

							{/* Seção "Checklists" sem fundo/borda própria — se integra ao resto do dashboard, só
							separada por espaçamento vertical (o `gap-6` do container pai), igual às outras seções da
							página (item 1 da 8ª rodada de feedback). Título no mesmo estilo das outras seções de
							página (`text-sm font-medium text-foreground`), copiado do código real (ex.: "Tendência de
							recebido" em `FinanceiroContent.tsx`), não um valor novo. */}
							<div className="flex flex-col gap-4">
								{/* Título de seção + "ver tudo", acima dos carrosséis (padrão Netflix/iFood) — item 4 do feedback
								de revisão: um único link pra área, não um por faixa (Materiais não tem link próprio). */}
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm font-medium text-foreground">Checklists</p>
									<Link href="/checklists?aba=comunicacao" className="text-sm font-medium text-primary hover:underline">
										Ver todos os checklists →
									</Link>
								</div>

								{/* Materiais não implementa o contrato ChecklistResumo (spec-checklist-materiais.md), mas
								agora compartilha a mesma página de gestão `/checklists` (aba Comunicação, seção própria) —
								item 4 do feedback de revisão. */}
								<div className="flex flex-col gap-3">
									<h3 className="text-sm font-medium text-muted-foreground">Materiais</h3>
									<ChecklistMateriais itens={itensMateriais} turmasAtivas={turmasAtivas} />
								</div>

								<div className="flex flex-col gap-3">
									<h3 className="text-sm font-medium text-muted-foreground">Comunicação</h3>
									{/* Faixa rolável (mobile) / grade (desktop) de checklists — seção 5.1 da spec-checklist-motor.md. */}
									<div className="mr-[-1.5rem] flex snap-x snap-mandatory gap-4 overflow-x-auto pr-6 pb-2 sm:mr-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:pr-0 lg:grid-cols-3">
										{checklistsComunicacao.map((resumo) => (
											<div key={resumo.id} className="w-[85vw] shrink-0 snap-start sm:w-auto">
												{resumo.id === "comunicacao-dia" ? (
													<VagoesChecklist resumo={resumo} aguardando={aguardandoResposta} />
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
