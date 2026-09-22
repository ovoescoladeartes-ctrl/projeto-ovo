import { ROLES, type Role } from "@/core/auth/Role";
import { BUCKETS, bucketKeyDe } from "@/core/comunicacao/buckets";
import type { ContatoResumo } from "@/core/db/contatos";
import type { FunnelStageCount, KpiCardData } from "@/core/dashboard/types";
import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import type { Repasse } from "@/core/financeiro/repasses/schema";
import { calcularRecebidoNoMes, calcularSaldoVivo, listarRepassesAVencer } from "@/core/financeiro/saldo";
import { calcularRecebidoPorTurma, calcularSerieMensalRecebido, type PontoSerieMensal, type RankingTurma } from "@/core/financeiro/series";
import type { Turma } from "@/core/turmas/schema";
import { formatCentavos } from "@/lib/currency";

export const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];
export const VAGOES_ROLES: readonly Role[] = ["admin", "comunicacao"];
/**
 * A aba Geral do Dashboard é só saúde operacional da escola (alunos, turmas, professores) —
 * nunca dado financeiro (aba Financeiro) nem de comunicação/funil (aba Comunicação), decisão do
 * Rogério em 2026-08-17. Sem dado sensível, o gate é todos os papéis, inclusive `educador`, que
 * hoje não tinha nenhuma aba do Dashboard visível.
 */
export const GERAL_ROLES: readonly Role[] = ROLES;
const REPASSES_JANELA_DIAS = 7;
const MESES_TENDENCIA = 6;
const TOP_N_TURMAS = 5;

export interface DadosKpisFinanceiro {
	// `calcularRecebidoNoMes`/`calcularSaldoVivo`/`listarRepassesAVencer`/`calcularSerieMensalRecebido`/
	// `calcularRecebidoPorTurma` (core/financeiro/saldo.ts, series.ts) tipam os parâmetros como
	// array mutável — mantido igual aqui pra aceitar o retorno de `lerRecebimentos()`/`lerRepasses()`
	// sem exigir cópia.
	recebimentos: Recebimento[];
	repasses: Repasse[];
	turmas: Turma[];
}

/** Pura — recebe os arrays já lidos por `src/core/db/` (`lerRecebimentos`, `lerRepasses`, `lerTurmas`), não acessa o Firestore. */
export function montarKpisEPendenciasFinanceiro(
	dados: DadosKpisFinanceiro,
	agora: Date,
): {
	kpis: KpiCardData[];
	tendencia: PontoSerieMensal[];
	recebidoPorTurma: RankingTurma[];
} {
	const turmasNomes: Record<string, string> = {};
	dados.turmas.forEach((turma) => {
		turmasNomes[turma.id] = turma.nome;
	});

	const { recebimentos, repasses } = dados;

	const recebimentosPendentesTodos = recebimentos
		.filter((recebimento) => recebimento.status === "pendente")
		.sort((a, b) => (a.dataRecebimento ?? "").localeCompare(b.dataRecebimento ?? ""));
	const totalRecebimentosPendentes = recebimentosPendentesTodos.reduce((soma, recebimento) => soma + recebimento.valorCentavos, 0);

	const repassesAVencerTodos = listarRepassesAVencer(repasses, REPASSES_JANELA_DIAS, agora);
	const totalRepassesAVencer = repassesAVencerTodos.reduce((soma, repasse) => soma + repasse.valorCentavos, 0);

	const kpis: KpiCardData[] = [
		{
			icon: "recebido",
			label: "Recebido no mês",
			value: formatCentavos(calcularRecebidoNoMes(recebimentos)),
			subtitle: "Recebimentos confirmados",
		},
		{
			icon: "saldo",
			label: "Saldo vivo",
			value: formatCentavos(calcularSaldoVivo(recebimentos, repasses)),
			subtitle: "Confirmado − repasses pagos",
		},
		{
			icon: "repasses",
			label: "Repasses a vencer",
			value: formatCentavos(totalRepassesAVencer),
			subtitle: `${repassesAVencerTodos.length} repasse${repassesAVencerTodos.length === 1 ? "" : "s"} em ${REPASSES_JANELA_DIAS} dias`,
		},
		{
			icon: "pendentes",
			label: "Recebimentos pendentes",
			value: formatCentavos(totalRecebimentosPendentes),
			subtitle: `${recebimentosPendentesTodos.length} aguardando confirmação`,
		},
	];

	const tendencia = calcularSerieMensalRecebido(recebimentos, MESES_TENDENCIA, agora);
	const recebidoPorTurma = calcularRecebidoPorTurma(recebimentos, turmasNomes, TOP_N_TURMAS);

	return { kpis, tendencia, recebidoPorTurma };
}

/** Pura — recebe os contatos ativos já lidos por `src/core/db/` (`lerContatosAtivos`), não acessa o Firestore. */
export function montarKpisEPendenciasComunicacao(
	contatos: ContatoResumo[],
	agora: Date,
): { kpis: KpiCardData[]; funil: FunnelStageCount[] } {
	const contagemPorBucket = new Map<string, number>();
	BUCKETS.forEach((bucket) => contagemPorBucket.set(bucket.key, 0));
	contatos.forEach((contato) => {
		const chave = bucketKeyDe(contato);
		contagemPorBucket.set(chave, (contagemPorBucket.get(chave) ?? 0) + 1);
	});
	const funil: FunnelStageCount[] = BUCKETS.map((bucket) => ({
		label: bucket.label,
		value: contagemPorBucket.get(bucket.key) ?? 0,
		kind: bucket.estagio === "arquivado" ? "arquivado-motivo" : "estagio",
	}));

	const seteDiasAtras = new Date(agora);
	seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
	const leadsDaSemana = contatos.filter((contato) => contato.criadoEm !== null && new Date(contato.criadoEm) >= seteDiasAtras);
	const leadsSemResposta = leadsDaSemana.filter((contato) => contato.estagio === "novo");

	// "Convertidos no mês" — mesmo mês de estagioAtualizadoEm, que reflete quando o contato virou
	// "convertido" (matricular() sempre atualiza esse campo ao mudar de estágio, ver design.md
	// regra 27). Espelha "Leads da semana": entrada no funil × resultado do funil no período.
	const anoMesAtual = agora.toISOString().slice(0, 7);
	const convertidosNoMes = contatos.filter(
		(contato) => contato.estagio === "convertido" && contato.estagioAtualizadoEm !== null && contato.estagioAtualizadoEm.slice(0, 7) === anoMesAtual,
	);

	const kpis: KpiCardData[] = [
		{ icon: "leads", label: "Leads da semana", value: String(leadsDaSemana.length), subtitle: `${leadsSemResposta.length} sem resposta` },
		{ icon: "convertidos", label: "Convertidos no mês", value: String(convertidosNoMes.length), subtitle: "Viraram aluno" },
	];

	return { kpis, funil };
}
