import type {
	FunnelStageCount,
	KpiCardData,
	PendenciaItem,
	RitualChecklistItemData,
} from "./types";

export const mockKpisComunicacao: KpiCardData[] = [
	{ label: "Alunos ativos", value: "23", subtitle: "por turma" },
	{ label: "Leads da semana", value: "5", subtitle: "2 sem resposta" },
];

export const mockKpisFinanceiro: KpiCardData[] = [
	{ label: "Recebido no mês", value: "R$8.420", subtitle: "de R$9.600 esperado (88%)" },
	{ label: "A liberar do Wix", value: "R$2.340", subtitle: "próxima liberação: 22/out" },
	{ label: "Saldo vivo", value: "R$3.180", subtitle: "após saídas pagas" },
	{ label: "Alunos ativos", value: "23", subtitle: "20 em dia · 2 falha · 1 Pix pend." },
];

export const mockFunnelStages: FunnelStageCount[] = [
	{ label: "Lead novo", value: 8, kind: "estagio" },
	{ label: "Em conversa", value: 5, kind: "estagio" },
	{ label: "Experimental", value: 3, kind: "estagio" },
	{ label: "Matriculado", value: 23, kind: "estagio" },
	{ label: "Ex-aluno", value: 4, kind: "arquivado-motivo" },
	{ label: "Não convertido", value: 4, kind: "arquivado-motivo" },
];

export const mockPendenciasComunicacao: PendenciaItem[] = [
	{ id: "1", icon: "erro", titulo: "Lead sem resposta", meta: "Maria Silva · há 26h" },
	{ id: "2", icon: "aviso", titulo: "Conversa esfriando", meta: "João Artes · 8 dias" },
	{
		id: "3",
		icon: "aviso",
		titulo: "Experimental sem follow-up",
		meta: "Beatriz Costa · 4 dias",
	},
];

export const mockPendenciasFinanceiro: PendenciaItem[] = [
	{
		id: "1",
		icon: "aviso",
		titulo: "Falha de cobrança",
		meta: "Ana Lima · Assinatura vencida há 2 dias",
	},
	{
		id: "2",
		icon: "info",
		titulo: "Pix pendente",
		meta: "Beatriz Costa · R$280 aguardando confirmação",
	},
	{
		id: "3",
		icon: "prazo",
		titulo: "Repasse dia 15",
		meta: "3 educadores · faltam 3 dias para o vencimento",
	},
	{
		id: "4",
		icon: "documento",
		titulo: "Nota fiscal faltando",
		meta: "Prof. Marcos (Aquarela) · pendente",
	},
	{
		id: "5",
		icon: "calendario",
		titulo: "Ritual de segunda",
		meta: "Reconciliação desta semana não concluída",
	},
];

export const mockRitualChecklist: RitualChecklistItemData[] = [
	{ id: "1", label: "Conferir entradas novas", concluido: true },
	{ id: "2", label: "Confirmar Pix pendentes", concluido: true },
	{ id: "3", label: "Revisar falhas de cobrança", concluido: false },
	{ id: "4", label: "Checar repasses do dia 15", concluido: false },
	{ id: "5", label: "Exportar relatório", concluido: false },
];

export const mockAlertaCobranca = {
	mensagem: "Falha de cobrança · Ana Lima · Assinatura vencida há 2 dias. A cobrança automática falhou.",
};
