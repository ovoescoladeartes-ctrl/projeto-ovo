import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { toIso } from "@/core/shared/serialize";

import type { ItemMaterial } from "./schema";

const COLECAO = "materiaisChecklist";

interface ItemMaterialDoc {
	titulo: string;
	comprado: boolean;
	criadoEm?: Timestamp;
	compradoEm?: Timestamp;
}

/** Lista todos os itens (comprados e não) — quem decide o que mostrar/ocultar é a UI (`ChecklistMateriais`), não esta consulta. */
export async function buscarItensMateriais(firestore: FirebaseFirestore.Firestore): Promise<ItemMaterial[]> {
	const snapshot = await firestore.collection(COLECAO).orderBy("criadoEm", "asc").get();
	return snapshot.docs.map((doc) => {
		const data = doc.data() as ItemMaterialDoc;
		return {
			id: doc.id,
			titulo: data.titulo,
			comprado: data.comprado,
			criadoEm: toIso(data.criadoEm ?? null),
			compradoEm: toIso(data.compradoEm ?? null),
		};
	});
}
