import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { FECHAMENTO_ITENS, type FechamentoItemId, type FechamentoLinhaEstado } from "@/core/financeiro/fechamento/schema";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface FechamentoItemDoc {
	concluido: boolean;
	concluidoEm?: Timestamp;
	concluidoPor?: string | null;
}

type FechamentoMesDoc = Partial<Record<FechamentoItemId, FechamentoItemDoc>>;

/** Uma entrada de cache por período (yyyy-MM) — só a leitura do doc `fechamentosMensais/{periodo}` (Fase 2.2 do plano de redução de leituras). */
export const lerFechamentoMes = cacheDeColecao("fechamentoMes", "fechamentosMensais", async (periodo: string): Promise<FechamentoLinhaEstado[]> => {
	const doc = await getFirebaseAdminFirestore().collection("fechamentosMensais").doc(periodo).get();
	registrarLeitura("fechamentosMensais", doc.exists ? 1 : 0);
	const data = doc.exists ? (doc.data() as FechamentoMesDoc) : undefined;
	return FECHAMENTO_ITENS.map((definicao) => {
		const estado = data?.[definicao.id];
		return {
			id: definicao.id,
			label: definicao.label,
			concluido: estado?.concluido ?? false,
			concluidoEm: toIso(estado?.concluidoEm ?? null),
			concluidoPor: estado?.concluidoPor ?? null,
			explicacao: definicao.explicacao,
		};
	});
});
