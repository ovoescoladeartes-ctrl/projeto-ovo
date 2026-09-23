import "server-only";

import type { ChecklistCustomizado, ChecklistDoc, ChecklistItemDoc } from "@/core/checklist/consultas";
import type { ChecklistArea } from "@/core/checklist/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

function converterItem(item: ChecklistItemDoc): ChecklistCustomizado["itens"][number] {
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

/**
 * Migrado de `core/checklist/consultas.ts` (`buscarChecklistsCustomizados`) — mesmo mapper, agora
 * cacheado. Uma entrada de cache por `area` (o argumento entra na chave do `unstable_cache`
 * automaticamente); a Home chama pra "financeiro" e "comunicacao" separadamente, igual já fazia.
 */
export const lerChecklistsCustomizados = cacheDeColecao(
	"checklistsCustomizados",
	"checklists",
	async (area: ChecklistArea): Promise<ChecklistCustomizado[]> => {
		const snapshot = await getFirebaseAdminFirestore().collection("checklists").where("area", "==", area).get();
		registrarLeitura(`checklistsCustomizados:${area}`, snapshot.size);
		return snapshot.docs.map((doc) => converterDoc(doc.id, doc.data() as ChecklistDoc));
	},
);
