import { redirect } from "next/navigation";

import { ChecklistCustomizadoCard } from "@/components/checklist/ChecklistCustomizadoCard";
import { LinkVerArquivadas } from "@/components/checklist/LinkVerArquivadas";
import { NovoChecklistDialog } from "@/components/checklist/NovoChecklistDialog";
import { ChecklistFechamento } from "@/components/dashboard/ChecklistFechamento";
import { ChecklistFinanceiro } from "@/components/dashboard/ChecklistFinanceiro";
import { ChecklistMateriais } from "@/components/dashboard/ChecklistMateriais";
import { VagoesChecklist } from "@/components/dashboard/VagoesChecklist";
import { PageHeader } from "@/components/shell/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/core/auth/getServerSession";
import { IDS_CHECKLISTS_SISTEMA, resumoChecklistComunicacao, resumoFechamentoMensal, resumoRitualFinanceiro } from "@/core/checklist/adaptadores";
import { ordenarChecklists, resumoChecklistCustomizado } from "@/core/checklist/consultas";
import type { ChecklistItem, ChecklistResumo } from "@/core/checklist/schema";
import { buscarChecklistComunicacaoDoDia, chaveDia } from "@/core/comunicacao/checklist/consultas";
import { CAIXA_ROLES, VAGOES_ROLES } from "@/core/dashboard/consultas";
import { lerChecklistsCustomizados } from "@/core/db/checklistsCustomizados";
import { lerPreferenciasSistema } from "@/core/db/checklistsPreferencias";
import { lerContatosAtivos } from "@/core/db/contatos";
import { lerItensMateriais } from "@/core/db/materiais";
import { lerPendenciasManuaisAbertas } from "@/core/db/pendenciasManuais";
import { lerPessoas } from "@/core/db/pessoas";
import { lerRecebimentos } from "@/core/db/recebimentos";
import { lerRepasses } from "@/core/db/repasses";
import { lerTurmas } from "@/core/db/turmas";
import { buscarFechamentoDoMes, chavePeriodoDoMes } from "@/core/financeiro/fechamento/consultas";
import { montarPendenciasAcionaveis } from "@/core/financeiro/pendencias/consultas";
import { buscarPendenciasRitualHerdadas, buscarRitualDaSemana, chaveSemana, segundaFeiraDaSemana } from "@/core/financeiro/ritual/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { cn } from "@/lib/utils";

// Trocar só o searchParam `arquivados` na mesma rota pode servir uma resposta em cache do Router
// do Next em vez de buscar dados frescos no servidor (mesma causa raiz corrigida em pessoas/page.tsx).
export const dynamic = "force-dynamic";

interface ChecklistsSearchParams {
	arquivados?: string;
	aba?: string;
}

interface ChecklistsPageProps {
	searchParams: Promise<ChecklistsSearchParams>;
}

/**
 * Página de gestão de checklists (seção 5.5 da spec-checklist-motor.md) — "Ver mais" do dashboard.
 * Antes vivia em `/caixa/checklists` e `/vagoes/checklists`; movida pra cá (fora de Caixa/Vagões,
 * que são módulos de gestão de dado, não de checklist) com abas Financeiro/Comunicação, mesmo
 * padrão visual do dashboard (`src/app/(protected)/page.tsx`) — não há um componente de abas
 * isolado reutilizável, só o mesmo padrão de classes das `TabsTrigger` de lá.
 */
export default async function ChecklistsPage({ searchParams }: ChecklistsPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();
	const podeVerFinanceiro = session !== null && CAIXA_ROLES.includes(session.role);
	const podeVerComunicacao = session !== null && VAGOES_ROLES.includes(session.role);
	if (session === null || (!podeVerFinanceiro && !podeVerComunicacao)) {
		redirect("/");
	}

	const filtros = await searchParams;
	const mostrarArquivados = filtros.arquivados === "1";
	const abaPadrao = filtros.aba === "comunicacao" && podeVerComunicacao ? "comunicacao" : podeVerFinanceiro ? "financeiro" : "comunicacao";

	const agora = new Date();
	const dia = chaveDia(agora);

	// Leituras cacheadas (src/core/db/) — mesmo padrão da Home (src/app/(protected)/page.tsx):
	// uma leitura por coleção, mesmo array servindo `montarPendenciasAcionaveis` e o resto.
	const [pessoas, turmas, recebimentos, repasses, contatosAtivos, pendenciasManuaisAbertas, itensMateriais, preferenciasSistema] = await Promise.all([
		podeVerFinanceiro ? lerPessoas() : Promise.resolve([]),
		podeVerComunicacao || podeVerFinanceiro ? lerTurmas() : Promise.resolve([]),
		podeVerFinanceiro ? lerRecebimentos() : Promise.resolve([]),
		podeVerFinanceiro ? lerRepasses() : Promise.resolve([]),
		podeVerComunicacao ? lerContatosAtivos() : Promise.resolve([]),
		podeVerFinanceiro ? lerPendenciasManuaisAbertas() : Promise.resolve([]),
		podeVerComunicacao ? lerItensMateriais() : Promise.resolve([]),
		lerPreferenciasSistema(IDS_CHECKLISTS_SISTEMA),
	]);
	const pendenciasAcionaveis = podeVerFinanceiro
		? montarPendenciasAcionaveis({ repasses, recebimentos, pessoas, pendenciasManuais: pendenciasManuaisAbertas }, agora)
		: null;

	// Turmas ativas pro seletor de "Adicionar material" (item 3 da 8ª rodada de feedback).
	const turmasAtivas = turmas
		.filter((turma) => turma.ativo)
		.map((turma) => ({ id: turma.id, nome: turma.nome }))
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	// Ainda não cacheado (Fase 2): doc-gets por chave (semana/mês/dia) do Ritual, Fechamento e
	// Checklist do Dia — mesma ressalva da Home.
	const firestore = getFirebaseAdminFirestore();
	const [ritualDaSemana, pendenciasHerdadas, fechamento, customizadosFinanceiro, checklistComunicacao, customizadosComunicacao] = await Promise.all([
		podeVerFinanceiro ? buscarRitualDaSemana(firestore, chaveSemana(segundaFeiraDaSemana(agora))) : null,
		podeVerFinanceiro ? buscarPendenciasRitualHerdadas(firestore, agora) : null,
		podeVerFinanceiro ? buscarFechamentoDoMes(firestore, chavePeriodoDoMes(agora)) : null,
		podeVerFinanceiro ? lerChecklistsCustomizados("financeiro") : null,
		podeVerComunicacao ? buscarChecklistComunicacaoDoDia(firestore, contatosAtivos, dia, agora) : null,
		podeVerComunicacao ? lerChecklistsCustomizados("comunicacao") : null,
	]);

	let checklistsFinanceiro: ChecklistResumo[] = [];
	let arquivadosFinanceiro = 0;
	const itensCustomizadosFinanceiroPorId: Record<string, ChecklistItem[]> = {};
	if (ritualDaSemana !== null && pendenciasAcionaveis !== null && fechamento !== null && customizadosFinanceiro !== null) {
		const resumoRitual = resumoRitualFinanceiro(ritualDaSemana, pendenciasAcionaveis, preferenciasSistema["financeiro-ritual"]);
		const resumoFechamento = resumoFechamentoMensal(fechamento, preferenciasSistema["financeiro-fechamento"]);
		const resumosCustomizados = customizadosFinanceiro.map(resumoChecklistCustomizado);
		const todosFinanceiro = [resumoRitual, resumoFechamento, ...resumosCustomizados];
		checklistsFinanceiro = ordenarChecklists(todosFinanceiro.filter((resumo) => resumo.arquivado === mostrarArquivados));
		arquivadosFinanceiro = todosFinanceiro.filter((resumo) => resumo.arquivado).length;
		customizadosFinanceiro.forEach((checklist) => {
			itensCustomizadosFinanceiroPorId[checklist.id] = checklist.itens;
		});
	}

	let checklistsComunicacao: ChecklistResumo[] = [];
	let arquivadosComunicacao = 0;
	const itensCustomizadosComunicacaoPorId: Record<string, ChecklistItem[]> = {};
	if (checklistComunicacao !== null && customizadosComunicacao !== null) {
		const resumoDia = resumoChecklistComunicacao(checklistComunicacao, preferenciasSistema["comunicacao-dia"]);
		const resumosCustomizados = customizadosComunicacao.map(resumoChecklistCustomizado);
		const todosComunicacao = [resumoDia, ...resumosCustomizados];
		checklistsComunicacao = ordenarChecklists(todosComunicacao.filter((resumo) => resumo.arquivado === mostrarArquivados));
		arquivadosComunicacao = todosComunicacao.filter((resumo) => resumo.arquivado).length;
		customizadosComunicacao.forEach((checklist) => {
			itensCustomizadosComunicacaoPorId[checklist.id] = checklist.itens;
		});
	}

	const mensagemVazia = mostrarArquivados ? "Nenhum checklist arquivado." : "Nenhum checklist ativo.";

	return (
		<div>
			<PageHeader breadcrumb={[{ label: "Dashboard", href: "/" }, { label: "Checklists" }]} title="Checklists" />

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

				{podeVerFinanceiro && ritualDaSemana !== null && pendenciasAcionaveis !== null && pendenciasHerdadas !== null && fechamento !== null ? (
					<TabsContent value="financeiro" className="mt-6">
						<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
							<LinkVerArquivadas area="financeiro" mostrarArquivados={mostrarArquivados} quantidade={arquivadosFinanceiro} />
							<div className="sm:ml-auto">
								<NovoChecklistDialog area="financeiro" />
							</div>
						</div>

						{checklistsFinanceiro.length > 0 ? (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{checklistsFinanceiro.map((resumo) => (
									<div key={resumo.id}>
										{resumo.id === "financeiro-ritual" ? (
											<ChecklistFinanceiro
												resumo={resumo}
												semana={ritualDaSemana.semana}
												passosRitual={ritualDaSemana.itens}
												pendenciasAcionaveis={pendenciasAcionaveis}
												pendenciasHerdadas={pendenciasHerdadas}
											/>
										) : resumo.id === "financeiro-fechamento" ? (
											<ChecklistFechamento resumo={resumo} fechamento={fechamento} />
										) : (
											<ChecklistCustomizadoCard resumo={resumo} itens={itensCustomizadosFinanceiroPorId[resumo.id] ?? []} />
										)}
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">{mensagemVazia}</p>
						)}
					</TabsContent>
				) : null}

				{podeVerComunicacao && checklistComunicacao !== null && itensMateriais !== null ? (
					<TabsContent value="comunicacao" className="mt-6 flex flex-col gap-6">
						{/* Materiais não implementa o contrato ChecklistResumo, mas mora nesta mesma página de
						gestão agora — item 4 do feedback de revisão: substitui a ideia de uma URL própria
						(`/vagoes/materiais`), as ações específicas (criar/excluir item) continuam aqui dentro. */}
						<div className="flex flex-col gap-3">
							<h2 className="text-lg font-semibold text-foreground">Materiais</h2>
							<ChecklistMateriais itens={itensMateriais} turmasAtivas={turmasAtivas} />
						</div>

						<div className="flex flex-col gap-3">
							<h2 className="text-lg font-semibold text-foreground">Comunicação</h2>

							<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
								<LinkVerArquivadas area="comunicacao" mostrarArquivados={mostrarArquivados} quantidade={arquivadosComunicacao} />
								<div className="sm:ml-auto">
									<NovoChecklistDialog area="comunicacao" />
								</div>
							</div>

							{checklistsComunicacao.length > 0 ? (
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{checklistsComunicacao.map((resumo) => (
										<div key={resumo.id}>
											{resumo.id === "comunicacao-dia" ? (
												<VagoesChecklist resumo={resumo} dia={chaveDia(agora)} checklist={checklistComunicacao} />
											) : (
												<ChecklistCustomizadoCard resumo={resumo} itens={itensCustomizadosComunicacaoPorId[resumo.id] ?? []} />
											)}
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">{mensagemVazia}</p>
							)}
						</div>
					</TabsContent>
				) : null}
			</Tabs>
		</div>
	);
}
