import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { toIso } from "@/core/shared/serialize";

import type { ChecklistArea, ChecklistItem, ChecklistPreferenciasDoc, ChecklistResumo, ChecklistResumoComSinais } from "./schema";

const COLECAO = "checklists";
const COLECAO_PREFERENCIAS = "checklistsPreferencias";

/** Forma do documento em `checklists/{id}` — `Timestamp` é convertido pra ISO (`ChecklistCustomizado`) antes de sair deste módulo `server-only`, mesmo padrão de `RitualSemanaDoc`/`RitualSemana` em `financeiro/ritual/consultas.ts`. */
export interface ChecklistItemDoc {
	id: string;
	titulo: string;
	concluido: boolean;
	concluidoEm: Timestamp | null;
	concluidoPor: string | null;
	actionHref?: string;
	actionLabel?: string;
	explicacao?: string;
}

export interface ChecklistDoc {
	titulo: string;
	area: ChecklistArea;
	tema: string;
	descricao: string;
	pinado: boolean;
	arquivado: boolean;
	/** Embutido, não subcoleção — mesma escolha já usada em `RitualSemanaDoc`/`FechamentoMesDoc`, listas pequenas (raramente > 20 itens). */
	itens: ChecklistItemDoc[];
	criadoEm: Timestamp;
	criadoPor: string;
}

export interface ChecklistCustomizado {
	id: string;
	titulo: string;
	area: ChecklistArea;
	tema: string;
	descricao: string;
	pinado: boolean;
	arquivado: boolean;
	itens: ChecklistItem[];
	criadoEm: string | null;
	criadoPor: string;
}

function converterItem(item: ChecklistItemDoc): ChecklistItem {
	return {
		id: item.id,
		titulo: item.titulo,
		concluido: item.concluido,
		concluidoEm: toIso(item.concluidoEm),
		concluidoPor: item.concluidoPor,
		actionHref: item.actionHref,
		actionLabel: item.actionLabel,
		explicacao: item.explicacao,
	};
}

function converterDoc(id: string, data: ChecklistDoc): ChecklistCustomizado {
	return {
		id,
		titulo: data.titulo,
		area: data.area,
		tema: data.tema,
		descricao: data.descricao,
		pinado: data.pinado,
		arquivado: data.arquivado,
		itens: (data.itens ?? []).map(converterItem),
		criadoEm: toIso(data.criadoEm),
		criadoPor: data.criadoPor,
	};
}

export async function buscarChecklistsCustomizados(firestore: FirebaseFirestore.Firestore, area: ChecklistArea): Promise<ChecklistCustomizado[]> {
	const snapshot = await firestore.collection(COLECAO).where("area", "==", area).get();
	return snapshot.docs.map((doc) => converterDoc(doc.id, doc.data() as ChecklistDoc));
}

export async function buscarChecklistCustomizadoPorId(firestore: FirebaseFirestore.Firestore, id: string): Promise<ChecklistCustomizado | null> {
	const doc = await firestore.collection(COLECAO).doc(id).get();
	if (!doc.exists) {
		return null;
	}
	return converterDoc(doc.id, doc.data() as ChecklistDoc);
}

/** Busca as preferências (pin/arquivado) dos checklists de sistema de uma vez, indexadas pelo `id` fixo do resumo (ex.: "financeiro-ritual"). */
export async function buscarPreferenciasSistema(
	firestore: FirebaseFirestore.Firestore,
	ids: readonly string[],
): Promise<Record<string, ChecklistPreferenciasDoc>> {
	if (ids.length === 0) {
		return {};
	}
	const docs = await Promise.all(ids.map((id) => firestore.collection(COLECAO_PREFERENCIAS).doc(id).get()));
	const resultado: Record<string, ChecklistPreferenciasDoc> = {};
	docs.forEach((doc) => {
		if (doc.exists) {
			resultado[doc.id] = doc.data() as ChecklistPreferenciasDoc;
		}
	});
	return resultado;
}

export function resumoChecklistCustomizado(checklist: ChecklistCustomizado): ChecklistResumo {
	const totalPendentes = checklist.itens.filter((item) => !item.concluido).length;
	const comSinais: ChecklistResumoComSinais = {
		id: checklist.id,
		origem: "customizado",
		area: checklist.area,
		titulo: checklist.titulo,
		tema: checklist.tema,
		descricao: checklist.descricao,
		totalPendentes,
		temItens: checklist.itens.length > 0,
		pinado: checklist.pinado,
		arquivado: checklist.arquivado,
		score: 0,
		// `href` fica ausente de propósito: "Ver checklist completo" de um customizado sempre abre
		// o Sheet genérico (seção 5.3 da spec, "sem exceções"), nunca navega — o campo `href` do
		// contrato é reservado a uma migração futura pra página própria, não usado agora.
		// Itens de checklist customizado são sempre texto livre — sem sinal de evento/atualização
		// disponível ainda (seção 9 da spec).
		temEventoHojeOuAmanha: false,
		diasSemAtualizacao: 0,
	};
	return { ...comSinais, score: calcularScore(comSinais) };
}

/** Regra de priorização v1 (seção 6 da spec) — hipótese a calibrar depois de uso real, não uma fórmula fechada. */
export function calcularScore(resumo: ChecklistResumoComSinais): number {
	let score = 0;
	if (resumo.temEventoHojeOuAmanha) {
		score += 100;
	}
	score += resumo.diasSemAtualizacao;
	score += resumo.totalPendentes * 2;
	return score;
}

function compararChecklists(a: ChecklistResumo, b: ChecklistResumo): number {
	if (b.score !== a.score) {
		return b.score - a.score;
	}
	// Empate estável: ordem alfabética por título (seção 7 da spec, evita a lista "tremer" a cada reload).
	return a.titulo.localeCompare(b.titulo, "pt-BR");
}

/** Pinados primeiro (por score entre eles), depois o resto por score decrescente — usada tanto na faixa do dashboard quanto na página de gestão (seção 3/5.1/5.5 da spec). Não filtra arquivado: quem chama decide o que entra na lista. */
export function ordenarChecklists(resumos: readonly ChecklistResumo[]): ChecklistResumo[] {
	const pinados = resumos.filter((resumo) => resumo.pinado).sort(compararChecklists);
	const outros = resumos.filter((resumo) => !resumo.pinado).sort(compararChecklists);
	return [...pinados, ...outros];
}
