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
import { buscarChecklistsCustomizados, buscarPreferenciasSistema, ordenarChecklists, resumoChecklistCustomizado } from "@/core/checklist/consultas";
import type { ChecklistItem, ChecklistResumo } from "@/core/checklist/schema";
import { buscarChecklistComunicacaoDoDia, chaveDia } from "@/core/comunicacao/checklist/consultas";
import { buscarItensMateriais } from "@/core/comunicacao/materiais/consultas";
import { CAIXA_ROLES, VAGOES_ROLES } from "@/core/dashboard/consultas";
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
	const firestore = getFirebaseAdminFirestore();

	const [
		ritualDaSemana,
		pendenciasAcionaveis,
		pendenciasHerdadas,
		fechamento,
		customizadosFinanceiro,
		checklistComunicacao,
		customizadosComunicacao,
		itensMateriais,
		turmasSnapshot,
		preferenciasSistema,
	] = await Promise.all([
		podeVerFinanceiro ? buscarRitualDaSemana(firestore, chaveSemana(segundaFeiraDaSemana(agora))) : null,
		podeVerFinanceiro ? montarPendenciasAcionaveis(firestore, agora) : null,
		podeVerFinanceiro ? buscarPendenciasRitualHerdadas(firestore, agora) : null,
		podeVerFinanceiro ? buscarFechamentoDoMes(firestore, chavePeriodoDoMes(agora)) : null,
		podeVerFinanceiro ? buscarChecklistsCustomizados(firestore, "financeiro") : null,
		podeVerComunicacao ? buscarChecklistComunicacaoDoDia(firestore, chaveDia(agora), agora) : null,
		podeVerComunicacao ? buscarChecklistsCustomizados(firestore, "comunicacao") : null,
		podeVerComunicacao ? buscarItensMateriais(firestore) : null,
		podeVerComunicacao ? firestore.collection("turmas").get() : null,
		buscarPreferenciasSistema(firestore, IDS_CHECKLISTS_SISTEMA),
	]);

	// Turmas ativas pro seletor de "Adicionar material" (item 3 da 8ª rodada de feedback).
	const turmasAtivas: { id: string; nome: string }[] = [];
	turmasSnapshot?.docs.forEach((doc) => {
		const data = doc.data() as { nome: string; ativo: boolean };
		if (data.ativo) {
			turmasAtivas.push({ id: doc.id, nome: data.nome });
		}
	});
	turmasAtivas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

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
