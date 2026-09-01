import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import type { PendenciaItem } from "@/core/dashboard/types";
import { formatarDataCurta } from "@/core/financeiro/shared";
import { toIso } from "@/core/shared/serialize";

import { RITUAL_ITENS, type RitualItemEstado, type RitualItemId, type RitualSemana } from "./schema";

const COLECAO = "ritualSemanas";

/** Quantas semanas anteriores checar em busca de itens não concluídos (v1, valor fixo). */
const SEMANAS_HISTORICO = 8;

interface RitualItemDoc {
	concluido: boolean;
	concluidoEm?: Timestamp;
	concluidoPor?: string | null;
}

type RitualSemanaDoc = Partial<Record<RitualItemId, RitualItemDoc>>;

/** Segunda-feira (00:00 local) da semana que contém `data` — semanas do Ritual sempre começam na segunda. */
export function segundaFeiraDaSemana(data: Date): Date {
	const resultado = new Date(data);
	const diaDaSemana = resultado.getDay(); // 0 = domingo
	const diffParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
	resultado.setDate(resultado.getDate() + diffParaSegunda);
	resultado.setHours(0, 0, 0, 0);
	return resultado;
}

/** Chave de semana (yyyy-MM-dd) a partir de uma segunda-feira já calculada por `segundaFeiraDaSemana`. */
export function chaveSemana(segunda: Date): string {
	const ano = segunda.getFullYear();
	const mes = String(segunda.getMonth() + 1).padStart(2, "0");
	const dia = String(segunda.getDate()).padStart(2, "0");
	return `${ano}-${mes}-${dia}`;
}

function montarItensComEstado(doc: RitualSemanaDoc | undefined): RitualItemEstado[] {
	return RITUAL_ITENS.map((definicao) => {
		const estado = doc?.[definicao.id];
		return {
			id: definicao.id,
			label: definicao.label,
			concluido: estado?.concluido ?? false,
			concluidoEm: toIso(estado?.concluidoEm ?? null),
			concluidoPor: estado?.concluidoPor ?? null,
		};
	});
}

export async function buscarRitualDaSemana(firestore: FirebaseFirestore.Firestore, semana: string): Promise<RitualSemana> {
	const doc = await firestore.collection(COLECAO).doc(semana).get();
	return { semana, itens: montarItensComEstado(doc.exists ? (doc.data() as RitualSemanaDoc) : undefined) };
}

/**
 * Semanas anteriores (até `SEMANAS_HISTORICO` pra trás, sem contar a semana atual) que já tiveram
 * um Ritual iniciado (doc existe) mas ficaram com algum item não concluído — viram pendência
 * herdada nas telas de Pendências e no próprio Ritual (Figma: "Ritual de segunda: reconciliação
 * da semana 21/07 não concluída"), no mesmo formato de `PendenciaItem` já usado por `PendenciaRow`.
 * Semanas sem doc (Ritual nunca iniciado ali) não contam — não há histórico anterior ao lançamento
 * da funcionalidade.
 */
export async function buscarPendenciasRitualHerdadas(firestore: FirebaseFirestore.Firestore, agora: Date): Promise<PendenciaItem[]> {
	const segundaAtual = segundaFeiraDaSemana(agora);
	const semanasAnteriores: Date[] = [];
	for (let i = 1; i <= SEMANAS_HISTORICO; i += 1) {
		const data = new Date(segundaAtual);
		data.setDate(data.getDate() - 7 * i);
		semanasAnteriores.push(data);
	}

	const resultados = await Promise.all(
		semanasAnteriores.map(async (segunda): Promise<PendenciaItem | null> => {
			const semana = chaveSemana(segunda);
			const doc = await firestore.collection(COLECAO).doc(semana).get();
			if (!doc.exists) {
				return null;
			}

			const itens = montarItensComEstado(doc.data() as RitualSemanaDoc);
			const temPendente = itens.some((item) => !item.concluido);
			if (!temPendente) {
				return null;
			}

			return {
				id: `ritual-${semana}`,
				icon: "calendario",
				titulo: `Ritual de segunda: reconciliação da semana ${formatarDataCurta(segunda)} não concluída`,
				meta: "Item herdado do ciclo anterior • Requer revisão manual",
			};
		}),
	);

	return resultados.filter((item): item is PendenciaItem => item !== null);
}
