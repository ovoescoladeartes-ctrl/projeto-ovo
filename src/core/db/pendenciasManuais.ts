import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { PendenciaManual, PendenciaManualStatus } from "@/core/financeiro/pendencias/schema";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface PendenciaManualDoc {
	titulo: string;
	meta: string;
	status: PendenciaManualStatus;
	criadoEm?: Timestamp;
	resolvidoEm?: Timestamp;
}

/** Só as abertas — migrado de `financeiro/pendencias/consultas.ts` (antiga `buscarPendenciasManuais`). */
export const lerPendenciasManuaisAbertas = cacheDeColecao("pendenciasManuaisAbertas", "pendenciasManuais", async (): Promise<PendenciaManual[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("pendenciasManuais").where("status", "==", "aberta").get();
	registrarLeitura("pendenciasManuaisAbertas", snapshot.size);
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
});
