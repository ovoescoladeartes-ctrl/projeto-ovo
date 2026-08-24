import "server-only";

import { FieldPath, type Timestamp } from "firebase-admin/firestore";

import type { PendenciaIcon } from "@/core/dashboard/types";
import { toIso } from "@/core/shared/serialize";

import { RITUAL_ITENS, type RitualItemId } from "./itens";
import type { RitualChecklistSemana, RitualItemEstado } from "./schema";
import { chaveSemana, formatarIntervaloSemana, segundaFeiraDe } from "./semana";

const COLECAO = "ritual_checklist_semanas";
/**
 * Corte deliberado de v1: só as 8 semanas mais recentes com doc incompleto entram na lista de
 * pendência herdada. Uma semana incompleta que envelhece além desse número de semanas seguintes
 * sai da lista silenciosamente — aceitável por ora (ritual semanal, 8 semanas ~ 2 meses de
 * atraso), mas se isso passar a importar de verdade, trocar por paginação real em vez de um
 * corte fixo.
 */
const SEMANAS_HERDADAS_LIMITE = 8;

interface RitualItemDoc {
	concluido: boolean;
	concluidoEm?: Timestamp;
	concluidoPor?: string | null;
}

interface RitualSemanaDoc {
	itens?: Partial<Record<RitualItemId, RitualItemDoc>>;
}

function montarEstado(semana: string, doc: RitualSemanaDoc | undefined): RitualChecklistSemana {
	const itensDoc = doc?.itens ?? {};
	const itens: RitualItemEstado[] = RITUAL_ITENS.map((definicao) => {
		const itemDoc = itensDoc[definicao.id];
		return {
			id: definicao.id,
			label: definicao.label,
			concluido: itemDoc?.concluido ?? false,
			concluidoEm: toIso(itemDoc?.concluidoEm ?? null),
			concluidoPor: itemDoc?.concluidoPor ?? null,
		};
	});
	return { semana, itens };
}

/**
 * Doc ausente (semana nunca tocada) vira estado default (tudo pendente) — não escreve nada aqui.
 * O doc só é criado de fato na primeira chamada de `alternarItemRitual` (merge:true).
 */
export async function buscarRitualDaSemana(
	firestore: FirebaseFirestore.Firestore,
	chave: string,
): Promise<RitualChecklistSemana> {
	const doc = await firestore.collection(COLECAO).doc(chave).get();
	return montarEstado(chave, doc.exists ? (doc.data() as RitualSemanaDoc) : undefined);
}

/**
 * Versão em lote de `buscarRitualDaSemana` — um único round trip (`getAll`) em vez de N chamadas
 * `.doc(x).get()` separadas. Usada por `buscarFechamentoDoMes`, que precisa do ritual de várias
 * semanas do mesmo período de uma vez.
 */
export async function buscarRituaisDasSemanas(
	firestore: FirebaseFirestore.Firestore,
	chaves: readonly string[],
): Promise<RitualChecklistSemana[]> {
	if (chaves.length === 0) {
		return [];
	}
	const colecao = firestore.collection(COLECAO);
	const docs = await firestore.getAll(...chaves.map((chave) => colecao.doc(chave)));
	return docs.map((doc, index) => montarEstado(chaves[index] ?? doc.id, doc.exists ? (doc.data() as RitualSemanaDoc) : undefined));
}

export interface PendenciaRitualHerdada {
	id: string;
	icon: PendenciaIcon;
	titulo: string;
	meta: string;
	semana: string;
}

/**
 * Semanas passadas com doc existente mas incompleto viram pendência herdada na tela de
 * Pendências/no card do Ritual. Semanas sem doc nenhum (nunca abertas, incl. todo o histórico
 * anterior a esta feature) não entram — senão o histórico pré-feature inundaria a lista.
 */
export async function buscarPendenciasRitualHerdadas(
	firestore: FirebaseFirestore.Firestore,
	agora: Date,
): Promise<PendenciaRitualHerdada[]> {
	const semanaAtual = chaveSemana(segundaFeiraDe(agora));
	const colecao = firestore.collection(COLECAO);
	const snapshot = await colecao
		.orderBy(FieldPath.documentId(), "desc")
		.startAfter(colecao.doc(semanaAtual))
		.limit(SEMANAS_HERDADAS_LIMITE)
		.get();

	return snapshot.docs
		.map((doc) => montarEstado(doc.id, doc.data() as RitualSemanaDoc))
		.filter((semana) => semana.itens.some((item) => !item.concluido))
		.map((semana) => {
			const dataSemana = new Date(`${semana.semana}T00:00:00`);
			return {
				id: `ritual-${semana.semana}`,
				icon: "aviso" as const,
				titulo: "Ritual de segunda",
				meta: `Reconciliação da semana ${formatarIntervaloSemana(dataSemana)} não concluída`,
				semana: semana.semana,
			};
		});
}
