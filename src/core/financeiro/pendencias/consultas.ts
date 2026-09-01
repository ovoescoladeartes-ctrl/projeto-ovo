import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { destinoRepasseLabel, formatarDataCurta, type Origem } from "@/core/financeiro/shared";
import { listarRepassesAVencer } from "@/core/financeiro/saldo";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

import type { PendenciaAcionavel, PendenciaManual, PendenciaManualStatus } from "./schema";

const COLECAO = "pendenciasManuais";
const REPASSES_JANELA_DIAS = 7;

interface PendenciaManualDoc {
	titulo: string;
	meta: string;
	status: PendenciaManualStatus;
	criadoEm?: Timestamp;
	resolvidoEm?: Timestamp;
}

interface RecebimentoDoc {
	pessoaId: string;
	valorCentavos: number;
	formaPagamento: string;
	status: string;
	origem: string;
	ativo: boolean;
}

interface RepasseDoc {
	destinoTipo: string;
	destinoPessoaId: string | null;
	valorCentavos: number;
	vencimento?: Timestamp;
	status: string;
	origem: string;
	ativo: boolean;
}

interface PessoaDoc {
	nome: string;
}

/** Busca pendências lançadas manualmente e ainda abertas (ex.: "Nota fiscal faltando"). */
export async function buscarPendenciasManuais(firestore: FirebaseFirestore.Firestore): Promise<PendenciaManual[]> {
	const snapshot = await firestore.collection(COLECAO).where("status", "==", "aberta").get();

	return snapshot.docs.map((doc) => {
		const data = doc.data() as PendenciaManualDoc;
		return {
			id: doc.id,
			titulo: data.titulo,
			meta: data.meta,
			status: data.status,
			criadoEm: toIso(data.criadoEm ?? null),
			resolvidoEm: toIso(data.resolvidoEm ?? null),
		};
	});
}

/**
 * Monta a lista completa de "Pendências Acionáveis" (Figma: frame "Checklist — Pendências"):
 * repasses a vencer/vencidos, recebimentos via Pix ainda pendentes de confirmação, e pendências
 * manuais abertas. "Falha de cobrança" do Figma não tem hoje um status equivalente em
 * `RecebimentoStatus` (só confirmado/pendente/cancelado) — por ora esse tipo só entra via
 * pendência manual, até existir um sinal real de falha de cobrança nos dados.
 */
export async function montarPendenciasAcionaveis(firestore: FirebaseFirestore.Firestore, agora: Date): Promise<PendenciaAcionavel[]> {
	const [repassesSnapshot, recebimentosSnapshot, pessoasSnapshot, pendenciasManuais] = await Promise.all([
		firestore.collection("repasses").get(),
		firestore.collection("recebimentos").get(),
		firestore.collection("pessoas").get(),
		buscarPendenciasManuais(firestore),
	]);

	const pessoasNomes: Record<string, string> = {};
	pessoasSnapshot.docs.forEach((doc) => {
		pessoasNomes[doc.id] = (doc.data() as PessoaDoc).nome;
	});

	const repasses = repassesSnapshot.docs
		.map((doc) => {
			const data = doc.data() as RepasseDoc;
			return {
				id: doc.id,
				destinoTipo: data.destinoTipo as "educador" | "espaco" | "outro",
				destinoPessoaId: data.destinoPessoaId,
				valorCentavos: data.valorCentavos,
				status: data.status as "pendente" | "pago",
				vencimento: toIso(data.vencimento ?? null),
				origem: data.origem as Origem,
				ativo: data.ativo,
			};
		})
		.filter((repasse) => repasse.ativo);

	const repassesAVencer = listarRepassesAVencer(repasses, REPASSES_JANELA_DIAS, agora);

	const itensRepasse: PendenciaAcionavel[] = repassesAVencer.map((repasse) => {
		const destino = destinoRepasseLabel(repasse, pessoasNomes);
		const vencimentoLabel = repasse.vencimento !== null ? `vencimento ${formatarDataCurta(new Date(repasse.vencimento))}` : "sem data de vencimento";
		return {
			id: `repasse-${repasse.id}`,
			titulo: "Repasse a vencer",
			meta: `${destino} · ${vencimentoLabel}`,
			origem: repasse.origem,
			tipo: "repasse",
			pendenciaManualId: null,
		};
	});

	const itensPix: PendenciaAcionavel[] = recebimentosSnapshot.docs
		.map((doc) => {
			const data = doc.data() as RecebimentoDoc;
			return { id: doc.id, ...data };
		})
		.filter((recebimento) => recebimento.ativo && recebimento.status === "pendente" && recebimento.formaPagamento === "pix")
		.map((recebimento) => ({
			id: `recebimento-${recebimento.id}`,
			titulo: "Pix pendente",
			meta: `${pessoasNomes[recebimento.pessoaId] ?? "Pessoa"} · ${formatCentavos(recebimento.valorCentavos)} aguardando confirmação`,
			origem: recebimento.origem as Origem,
			tipo: "recebimento",
			pendenciaManualId: null,
		}));

	const itensManuais: PendenciaAcionavel[] = pendenciasManuais.map((pendencia) => ({
		id: `manual-${pendencia.id}`,
		titulo: pendencia.titulo,
		meta: pendencia.meta,
		origem: "manual",
		tipo: "manual",
		pendenciaManualId: pendencia.id,
	}));

	return [...itensRepasse, ...itensPix, ...itensManuais];
}
