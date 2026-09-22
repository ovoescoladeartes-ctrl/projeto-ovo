import "server-only";

import type { ChecklistPreferenciasDoc } from "@/core/checklist/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

/**
 * Migrado de `core/checklist/consultas.ts` (`buscarPreferenciasSistema`) — 3 doc-gets fixos
 * (`IDS_CHECKLISTS_SISTEMA`, sempre os mesmos ids), então uma única entrada de cache por chamada
 * já cobre o caso de uso: não é uma lista que cresce, diferente do aviso de "não cachear por
 * lista de chaves" da Fase 2 (doc-gets de `ritualSemanas`/`checklistComunicacaoDias`, chaves que
 * mudam a cada dia/semana).
 */
export const lerPreferenciasSistema = cacheDeColecao(
	"checklistsPreferencias",
	"checklistsPreferencias",
	async (ids: readonly string[]): Promise<Record<string, ChecklistPreferenciasDoc>> => {
		if (ids.length === 0) {
			return {};
		}
		const firestore = getFirebaseAdminFirestore();
		const docs = await Promise.all(ids.map((id) => firestore.collection("checklistsPreferencias").doc(id).get()));
		registrarLeitura("checklistsPreferencias", docs.filter((doc) => doc.exists).length);
		const resultado: Record<string, ChecklistPreferenciasDoc> = {};
		docs.forEach((doc) => {
			if (doc.exists) {
				resultado[doc.id] = doc.data() as ChecklistPreferenciasDoc;
			}
		});
		return resultado;
	},
);
