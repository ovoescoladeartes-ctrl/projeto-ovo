import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface EstadoItemDocRaw {
	concluido: boolean;
	concluidoEm?: Timestamp;
	concluidoPor?: string | null;
}

interface ManualItemDocRaw extends EstadoItemDocRaw {
	titulo: string;
}

export interface EstadoItemLido {
	concluido: boolean;
	concluidoEm: string | null;
	concluidoPor: string | null;
}

export interface ManualItemLido extends EstadoItemLido {
	titulo: string;
}

export interface ChecklistDiaLido {
	dia: string;
	contatos: Record<string, EstadoItemLido>;
	manuais: Record<string, ManualItemLido>;
}

function mapEstado(estado: EstadoItemDocRaw): EstadoItemLido {
	return { concluido: estado.concluido, concluidoEm: toIso(estado.concluidoEm ?? null), concluidoPor: estado.concluidoPor ?? null };
}

/**
 * Uma entrada de cache por dia — Checklist do Dia (Comunicação), Fase 2.3 do plano de redução de
 * leituras. Só lê o doc; a materialização (escrita) vive à parte em `comunicacao/checklist/materializar.ts`,
 * porque escrita não pode entrar num `unstable_cache` (regra 3 de `cacheDeColecao.ts`).
 */
export const lerChecklistDia = cacheDeColecao("checklistDia", "checklistComunicacaoDias", async (dia: string): Promise<ChecklistDiaLido> => {
	const doc = await getFirebaseAdminFirestore().collection("checklistComunicacaoDias").doc(dia).get();
	registrarLeitura("checklistComunicacaoDias", doc.exists ? 1 : 0);
	if (!doc.exists) {
		return { dia, contatos: {}, manuais: {} };
	}

	const data = doc.data() as { contatos?: Record<string, EstadoItemDocRaw>; manuais?: Record<string, ManualItemDocRaw> };

	const contatos: Record<string, EstadoItemLido> = {};
	Object.entries(data.contatos ?? {}).forEach(([id, estado]) => {
		contatos[id] = mapEstado(estado);
	});

	const manuais: Record<string, ManualItemLido> = {};
	Object.entries(data.manuais ?? {}).forEach(([id, item]) => {
		manuais[id] = { ...mapEstado(item), titulo: item.titulo };
	});

	return { dia, contatos, manuais };
});
