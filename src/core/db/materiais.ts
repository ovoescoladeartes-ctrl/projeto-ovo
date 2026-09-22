import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import type { ItemMaterial } from "@/core/comunicacao/materiais/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface ItemMaterialDoc {
	titulo: string;
	comprado: boolean;
	criadoEm?: Timestamp;
	compradoEm?: Timestamp;
	turmaId?: string | null;
	turmaNome?: string | null;
}

/**
 * Lista todos os itens (comprados e não) — mesmo mapper de `core/comunicacao/materiais/consultas.ts`
 * (`buscarItensMateriais`), que continua existindo por enquanto porque `/checklists` (Fase 3) ainda
 * a usa diretamente; a Home usa esta versão cacheada.
 */
export const lerItensMateriais = cacheDeColecao("itensMateriais", "materiaisChecklist", async (): Promise<ItemMaterial[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("materiaisChecklist").orderBy("criadoEm", "asc").get();
	registrarLeitura("itensMateriais", snapshot.size);
	return snapshot.docs.map((doc) => {
		const data = doc.data() as ItemMaterialDoc;
		return {
			id: doc.id,
			titulo: data.titulo,
			comprado: data.comprado,
			criadoEm: toIso(data.criadoEm ?? null),
			compradoEm: toIso(data.compradoEm ?? null),
			turmaId: data.turmaId ?? null,
			turmaNome: data.turmaNome ?? null,
		};
	});
});
