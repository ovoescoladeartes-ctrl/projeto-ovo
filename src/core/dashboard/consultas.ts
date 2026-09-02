import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { ROLES, type Role } from "@/core/auth/Role";
import { BUCKETS, bucketKeyDe } from "@/core/comunicacao/buckets";
import type { ArquivadoMotivo, Estagio } from "@/core/comunicacao/contatos/schema";
import type { FunnelStageCount, KpiCardData } from "@/core/dashboard/types";
import type { RecebimentoStatus } from "@/core/financeiro/recebimentos/schema";
import type { DestinoTipo, RepasseStatus } from "@/core/financeiro/repasses/schema";
import { calcularRecebidoNoMes, calcularSaldoVivo, listarRepassesAVencer } from "@/core/financeiro/saldo";
import { calcularRecebidoPorTurma, calcularSerieMensalRecebido, type PontoSerieMensal, type RankingTurma } from "@/core/financeiro/series";
import { toIso } from "@/core/shared/serialize";
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

interface RecebimentoDoc {
	pessoaId: string;
	turmaId: string | null;
	valorCentavos: number;
	status: string;
	dataRecebimento?: Timestamp;
	ativo: boolean;
}

interface TurmaDoc {
	nome: string;
}

interface RepasseDoc {
	destinoTipo: string;
	destinoPessoaId: string | null;
	valorCentavos: number;
	vencimento?: Timestamp;
	status: string;
	ativo: boolean;
}

interface ContatoDoc {
	nome: string;
	estagio: string;
	arquivadoMotivo: string | null;
	estagioAtualizadoEm?: Timestamp;
	criadoEm?: Timestamp;
	ativo: boolean;
}

interface RecebimentoResumo {
	id: string;
	pessoaId: string;
	turmaId: string | null;
	valorCentavos: number;
	status: RecebimentoStatus;
	dataRecebimento: string | null;
}

interface RepasseResumo {
	id: string;
	destinoTipo: DestinoTipo;
	destinoPessoaId: string | null;
	valorCentavos: number;
	status: RepasseStatus;
	vencimento: string | null;
}

interface ContatoResumo {
	id: string;
	nome: string;
	estagio: Estagio;
	arquivadoMotivo: ArquivadoMotivo | null;
	estagioAtualizadoEm: string | null;
	criadoEm: string | null;
}

export async function montarKpisEPendenciasFinanceiro(
	firestore: FirebaseFirestore.Firestore,
	agora: Date,
): Promise<{
	kpis: KpiCardData[];
	tendencia: PontoSerieMensal[];
	recebidoPorTurma: RankingTurma[];
}> {
	const [recebimentosSnapshot, repassesSnapshot, turmasSnapshot] = await Promise.all([
		firestore.collection("recebimentos").get(),
		firestore.collection("repasses").get(),
		firestore.collection("turmas").get(),
	]);

	const turmasNomes: Record<string, string> = {};
	turmasSnapshot.docs.forEach((doc) => {
		turmasNomes[doc.id] = (doc.data() as TurmaDoc).nome;
	});

	const recebimentos: RecebimentoResumo[] = recebimentosSnapshot.docs.map((doc) => {
		const data = doc.data() as RecebimentoDoc;
		return {
			id: doc.id,
			pessoaId: data.pessoaId,
			turmaId: data.turmaId,
			valorCentavos: data.valorCentavos,
			status: data.status as RecebimentoStatus,
			dataRecebimento: toIso(data.dataRecebimento ?? null),
		};
	});

	const repasses: RepasseResumo[] = repassesSnapshot.docs.map((doc) => {
		const data = doc.data() as RepasseDoc;
		return {
			id: doc.id,
			destinoTipo: data.destinoTipo as DestinoTipo,
			destinoPessoaId: data.destinoPessoaId,
			valorCentavos: data.valorCentavos,
			status: data.status as RepasseStatus,
			vencimento: toIso(data.vencimento ?? null),
		};
	});

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

export async function montarKpisEPendenciasComunicacao(
	firestore: FirebaseFirestore.Firestore,
	agora: Date,
): Promise<{ kpis: KpiCardData[]; funil: FunnelStageCount[] }> {
	const contatosSnapshot = await firestore
		.collection("contatos")
		.where("ativo", "==", true)
		.orderBy("estagioAtualizadoEm", "asc")
		.get();

	const contatos: ContatoResumo[] = contatosSnapshot.docs.map((doc) => {
		const data = doc.data() as ContatoDoc;
		return {
			id: doc.id,
			nome: data.nome,
			estagio: data.estagio as Estagio,
			arquivadoMotivo: data.arquivadoMotivo as ArquivadoMotivo | null,
			estagioAtualizadoEm: toIso(data.estagioAtualizadoEm ?? null),
			criadoEm: toIso(data.criadoEm ?? null),
		};
	});

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
