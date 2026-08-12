import type { Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FunnelStageRow } from "@/components/dashboard/FunnelStageRow";
import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { PendenciasList } from "@/components/dashboard/PendenciasList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { BUCKETS, bucketKeyDe } from "@/core/comunicacao/buckets";
import type { ArquivadoMotivo, Estagio } from "@/core/comunicacao/contatos/schema";
import { calcularUrgencia } from "@/core/comunicacao/urgencia";
import type { FunnelStageCount, KpiCardData, PendenciaItem } from "@/core/dashboard/types";
import type { RecebimentoStatus } from "@/core/financeiro/recebimentos/schema";
import type { DestinoTipo, RepasseStatus } from "@/core/financeiro/repasses/schema";
import { calcularRecebidoNoMes, calcularSaldoVivo, listarRepassesAVencer } from "@/core/financeiro/saldo";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { contarAlunosMatriculados } from "@/core/pessoas/contadores";
import type { Pessoa } from "@/core/pessoas/schema";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];
const VAGOES_ROLES: readonly Role[] = ["admin", "comunicacao"];
const REPASSES_JANELA_DIAS = 7;
const PENDENCIAS_LIMITE = 5;

interface RecebimentoDoc {
	pessoaId: string;
	valorCentavos: number;
	status: string;
	dataRecebimento?: Timestamp;
	ativo: boolean;
}

interface RepasseDoc {
	destinoTipo: string;
	destinoPessoaId: string | null;
	valorCentavos: number;
	vencimento?: Timestamp;
	status: string;
	ativo: boolean;
}

interface PessoaDoc {
	tipo: string;
	nome: string;
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

const TITULO_PENDENCIA_POR_ESTAGIO: Partial<Record<Estagio, string>> = {
	novo: "Lead sem resposta",
	em_conversa: "Conversa esfriando",
	experimental: "Experimental sem follow-up",
};

function diasDesde(iso: string | null, agora: Date): number {
	if (iso === null) {
		return 0;
	}
	return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

function diasAte(iso: string | null, agora: Date): number {
	if (iso === null) {
		return 0;
	}
	return Math.ceil((new Date(iso).getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
}

interface RecebimentoResumo {
	id: string;
	pessoaId: string;
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

function destinoRepasseLabel(repasse: RepasseResumo, pessoasNomes: Record<string, string>): string {
	if (repasse.destinoTipo === "educador") {
		return repasse.destinoPessoaId !== null ? (pessoasNomes[repasse.destinoPessoaId] ?? "Educador") : "Educador";
	}
	return repasse.destinoTipo === "espaco" ? "Espaço" : "Outro";
}

async function montarKpisEPendenciasFinanceiro(
	firestore: FirebaseFirestore.Firestore,
	agora: Date,
): Promise<{ kpis: KpiCardData[]; pendencias: PendenciaItem[] }> {
	const [recebimentosSnapshot, repassesSnapshot, pessoasSnapshot] = await Promise.all([
		firestore.collection("recebimentos").get(),
		firestore.collection("repasses").get(),
		firestore.collection("pessoas").get(),
	]);

	const pessoasNomes: Record<string, string> = {};
	const pessoas: Pick<Pessoa, "tipo" | "status" | "ativo">[] = [];
	pessoasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as PessoaDoc;
		pessoasNomes[doc.id] = data.nome;
		pessoas.push({ tipo: data.tipo as Pessoa["tipo"], status: data.status, ativo: data.ativo });
	});

	const recebimentos: RecebimentoResumo[] = recebimentosSnapshot.docs.map((doc) => {
		const data = doc.data() as RecebimentoDoc;
		return {
			id: doc.id,
			pessoaId: data.pessoaId,
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

	const kpis: KpiCardData[] = [
		{ label: "Recebido no mês", value: formatCentavos(calcularRecebidoNoMes(recebimentos)), subtitle: "Recebimentos confirmados" },
		{ label: "Saldo vivo", value: formatCentavos(calcularSaldoVivo(recebimentos, repasses)), subtitle: "Confirmado − repasses pagos" },
		{ label: "Alunos ativos", value: String(contarAlunosMatriculados(pessoas)), subtitle: "Matriculados" },
	];

	const recebimentosPendentes = recebimentos
		.filter((recebimento) => recebimento.status === "pendente")
		.sort((a, b) => (a.dataRecebimento ?? "").localeCompare(b.dataRecebimento ?? ""))
		.slice(0, PENDENCIAS_LIMITE);

	const repassesAVencer = listarRepassesAVencer(repasses, REPASSES_JANELA_DIAS, agora).slice(0, PENDENCIAS_LIMITE);

	const pendencias: PendenciaItem[] = [
		...recebimentosPendentes.map((recebimento) => ({
			id: `recebimento-${recebimento.id}`,
			icon: "info" as const,
			titulo: "Recebimento pendente",
			meta: `${pessoasNomes[recebimento.pessoaId] ?? "Pessoa"} · ${formatCentavos(recebimento.valorCentavos)} aguardando confirmação`,
		})),
		...repassesAVencer.map((repasse) => {
			const dias = diasAte(repasse.vencimento, agora);
			const prazo = dias < 0 ? `venceu há ${Math.abs(dias)}d` : dias === 0 ? "vence hoje" : `vence em ${dias}d`;
			return {
				id: `repasse-${repasse.id}`,
				icon: "prazo" as const,
				titulo: "Repasse a vencer",
				meta: `${destinoRepasseLabel(repasse, pessoasNomes)} · ${prazo}`,
			};
		}),
	];

	return { kpis, pendencias };
}

async function montarKpisEPendenciasComunicacao(
	firestore: FirebaseFirestore.Firestore,
	agora: Date,
): Promise<{ kpis: KpiCardData[]; funil: FunnelStageCount[]; pendencias: PendenciaItem[] }> {
	const [contatosSnapshot, pessoasSnapshot] = await Promise.all([
		firestore.collection("contatos").where("ativo", "==", true).orderBy("estagioAtualizadoEm", "asc").get(),
		firestore.collection("pessoas").get(),
	]);

	const pessoas: Pick<Pessoa, "tipo" | "status" | "ativo">[] = pessoasSnapshot.docs.map((doc) => {
		const data = doc.data() as PessoaDoc;
		return { tipo: data.tipo as Pessoa["tipo"], status: data.status, ativo: data.ativo };
	});

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

	const kpis: KpiCardData[] = [
		{ label: "Alunos ativos", value: String(contarAlunosMatriculados(pessoas)), subtitle: "Matriculados" },
		{ label: "Leads da semana", value: String(leadsDaSemana.length), subtitle: `${leadsSemResposta.length} sem resposta` },
	];

	const pendencias: PendenciaItem[] = contatos
		.filter((contato) => contato.estagio in TITULO_PENDENCIA_POR_ESTAGIO)
		.filter((contato) => calcularUrgencia(contato.estagioAtualizadoEm, agora) !== "recente")
		.slice(0, PENDENCIAS_LIMITE)
		.map((contato) => ({
			id: `contato-${contato.id}`,
			icon: calcularUrgencia(contato.estagioAtualizadoEm, agora) === "urgente" ? ("erro" as const) : ("aviso" as const),
			titulo: TITULO_PENDENCIA_POR_ESTAGIO[contato.estagio] ?? "Aguardando atualização",
			meta: `${contato.nome} · ${diasDesde(contato.estagioAtualizadoEm, agora)}d sem atualização`,
		}));

	return { kpis, funil, pendencias };
}

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

	const abaPadrao = podeVerComunicacao ? "comunicacao" : "financeiro";

	return (
		<div className="flex flex-col gap-6">
			<DashboardHeader />

			{!podeVerComunicacao && !podeVerFinanceiro ? (
				<p className="text-sm text-muted-foreground">Nenhum dado de dashboard disponível para o seu perfil ainda.</p>
			) : (
				<Tabs defaultValue={abaPadrao}>
					<TabsList className="bg-transparent p-0">
						{podeVerComunicacao ? (
							<TabsTrigger
								value="comunicacao"
								className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
							>
								Comunicação
							</TabsTrigger>
						) : null}
						{podeVerFinanceiro ? (
							<TabsTrigger
								value="financeiro"
								className="ml-6 rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
							>
								Financeiro
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
