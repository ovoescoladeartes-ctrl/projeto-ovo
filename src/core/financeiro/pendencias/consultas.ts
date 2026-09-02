import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import type { RepasseStatus } from "@/core/financeiro/repasses/schema";
import { listarRepassesAVencer } from "@/core/financeiro/saldo";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

import { PENDENCIAS_MANUAIS_FIXAS, type PendenciaManualId } from "./manuais";

const COLECAO_MANUAIS = "pendencias_manuais";
const REPASSES_JANELA_DIAS = 7;

interface RecebimentoDoc {
	pessoaId: string;
	valorCentavos: number;
	formaPagamento: string;
	origem: string;
	status: string;
	dataRecebimento?: Timestamp;
}

interface RepasseDoc {
	destinoTipo: string;
	destinoPessoaId: string | null;
	valorCentavos: number;
	vencimento?: Timestamp;
	status: string;
	origem: string;
}

export interface PendenciaAcionavelItem {
	id: string;
	titulo: string;
	origemLabel: string;
	acao: "link" | "manual";
	href?: string;
	manualId?: PendenciaManualId;
}

function origemLabel(origem: string): string {
	return origem === "wix" ? "Origem: dado do Wix" : "Origem: lançamento manual";
}

/**
 * Busca só os nomes das pessoas de fato referenciadas (não a coleção `pessoas` inteira) — evita
 * uma leitura por cadastro da escola pra resolver 2-3 nomes numa lista de pendências pendente.
 */
async function buscarNomesPessoas(firestore: FirebaseFirestore.Firestore, ids: readonly string[]): Promise<Record<string, string>> {
	if (ids.length === 0) {
		return {};
	}
	const refs = [...new Set(ids)].map((id) => firestore.collection("pessoas").doc(id));
	const docs = await firestore.getAll(...refs);
	const nomes: Record<string, string> = {};
	docs.forEach((doc) => {
		if (doc.exists) {
			nomes[doc.id] = (doc.data() as { nome: string }).nome;
		}
	});
	return nomes;
}

/**
 * Busca própria desta rota (não reaproveita o fetch de `caixa/page.tsx`) pra não acoplar duas
 * páginas independentes. A separação "Falha de cobrança" vs "Pix pendente" é um heurístico —
 * `RecebimentoStatus` não tem um valor real de "falha", então aproxima: recebimento pendente
 * não-Pix (cobrança automática travada) vira "Falha de cobrança", Pix pendente vira "Pix
 * pendente". Validar essa categorização com o dono do produto antes de confiar cegamente nela.
 */
export async function montarPendenciasAcionaveis(
	firestore: FirebaseFirestore.Firestore,
	agora: Date,
): Promise<PendenciaAcionavelItem[]> {
	const [recebimentosSnapshot, repassesSnapshot] = await Promise.all([
		firestore.collection("recebimentos").where("status", "==", "pendente").get(),
		firestore.collection("repasses").get(),
	]);

	const recebimentosPendentes = recebimentosSnapshot.docs.map((doc) => {
		const data = doc.data() as RecebimentoDoc;
		return { id: doc.id, ...data };
	});

	const idsFalhaCobranca = recebimentosPendentes.filter((recebimento) => recebimento.formaPagamento !== "pix").map((recebimento) => recebimento.pessoaId);
	const pessoasNomes = await buscarNomesPessoas(firestore, idsFalhaCobranca);

	const repasses = repassesSnapshot.docs.map((doc) => {
		const data = doc.data() as RepasseDoc;
		return {
			id: doc.id,
			valorCentavos: data.valorCentavos,
			status: data.status as RepasseStatus,
			origem: data.origem,
			vencimento: toIso(data.vencimento ?? null),
		};
	});

	const recebimentosClassificados: PendenciaAcionavelItem[] = recebimentosPendentes.map((recebimento) => {
		const base = { origemLabel: origemLabel(recebimento.origem), acao: "link" as const, href: "/caixa?aba=recebimentos" };
		return recebimento.formaPagamento === "pix"
			? { id: `pix-${recebimento.id}`, titulo: `Pix pendente - ${formatCentavos(recebimento.valorCentavos)}`, ...base }
			: { id: `falha-${recebimento.id}`, titulo: `Falha de cobrança - ${pessoasNomes[recebimento.pessoaId] ?? "Pessoa"}`, ...base };
	});

	const repassesAVencer: PendenciaAcionavelItem[] = listarRepassesAVencer(repasses, REPASSES_JANELA_DIAS, agora).map((repasse) => ({
		id: `repasse-${repasse.id}`,
		titulo: `Repasse a vencer - ${repasse.vencimento ? new Date(repasse.vencimento).toLocaleDateString("pt-BR") : "sem data"}`,
		origemLabel: origemLabel(repasse.origem),
		acao: "link",
		href: "/caixa?aba=repasses",
	}));

	return [...recebimentosClassificados, ...repassesAVencer];
}

interface PendenciaManualDoc {
	resolvido?: boolean;
}

export async function buscarPendenciasManuais(firestore: FirebaseFirestore.Firestore): Promise<PendenciaAcionavelItem[]> {
	const colecao = firestore.collection(COLECAO_MANUAIS);
	const docs = await firestore.getAll(...PENDENCIAS_MANUAIS_FIXAS.map((definicao) => colecao.doc(definicao.id)));
	const definicoesComDoc = PENDENCIAS_MANUAIS_FIXAS.map((definicao, index) => ({ definicao, doc: docs[index] }));

	return definicoesComDoc
		.filter(({ doc }) => !((doc?.data() as PendenciaManualDoc | undefined)?.resolvido ?? false))
		.map(({ definicao }) => ({
			id: definicao.id,
			titulo: definicao.titulo,
			origemLabel: `Origem: lançamento manual · ${definicao.meta}`,
			acao: "manual" as const,
			manualId: definicao.id,
		}));
}
