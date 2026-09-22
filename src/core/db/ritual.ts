import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { RITUAL_ITENS, type RitualItemEstado, type RitualItemId, type RitualSemana } from "@/core/financeiro/ritual/schema";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface RitualItemDoc {
	concluido: boolean;
	concluidoEm?: Timestamp;
	concluidoPor?: string | null;
}

type RitualSemanaDoc = Partial<Record<RitualItemId, RitualItemDoc>>;

function montarItensComEstado(doc: RitualSemanaDoc | undefined): RitualItemEstado[] {
	return RITUAL_ITENS.map((definicao) => {
		const estado = doc?.[definicao.id];
		return {
			id: definicao.id,
			label: definicao.label,
			concluido: estado?.concluido ?? false,
			concluidoEm: toIso(estado?.concluidoEm ?? null),
			concluidoPor: estado?.concluidoPor ?? null,
			explicacao: definicao.explicacao,
		};
	});
}

/**
 * Uma entrada de cache por semana, não por lista de semanas — numa virada de semana só a chave nova
 * é cache-miss; as 7 anteriores (usadas por `buscarPendenciasRitualHerdadas`) continuam servidas do
 * cache (Fase 2 do plano de redução de leituras). `existiu` (doc.exists) é exposto à parte dos itens
 * default porque `buscarPendenciasRitualHerdadas` precisa distinguir "semana sem Ritual iniciado"
 * (não é pendência) de "semana com Ritual iniciado e nada concluído ainda" (é pendência).
 */
export const lerRitualSemana = cacheDeColecao("ritualSemana", "ritualSemanas", async (semana: string): Promise<RitualSemana & { existiu: boolean }> => {
	const doc = await getFirebaseAdminFirestore().collection("ritualSemanas").doc(semana).get();
	registrarLeitura("ritualSemanas", doc.exists ? 1 : 0);
	return { semana, existiu: doc.exists, itens: montarItensComEstado(doc.exists ? (doc.data() as RitualSemanaDoc) : undefined) };
});
