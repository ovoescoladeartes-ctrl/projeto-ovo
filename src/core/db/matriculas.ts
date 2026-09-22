import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { Matricula } from "@/core/matriculas/schema";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface MatriculaDoc {
	pessoaId: string;
	turmaId: string;
	dataMatricula?: Timestamp;
	dataEncerramento?: Timestamp | null;
	mensalidadeCombinadaCentavos: number;
	motivo?: string | null;
	status: string;
	ativo: boolean;
	/** Só preenchido pelo import CSV — sinaliza que `dataMatricula` é aproximada (ver `visaoGeral.ts`). */
	observacoes?: string | null;
}

/** Coleção inteira — quem precisa só das ativas ou só de uma pessoa/turma específica filtra em memória. */
export const lerMatriculas = cacheDeColecao("matriculas", "matriculas", async (): Promise<Matricula[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("matriculas").get();
	registrarLeitura("matriculas", snapshot.size);
	return snapshot.docs.map((doc) => {
		const data = doc.data() as MatriculaDoc;
		return {
			id: doc.id,
			pessoaId: data.pessoaId,
			turmaId: data.turmaId,
			dataMatricula: toIso(data.dataMatricula ?? null),
			dataEncerramento: toIso(data.dataEncerramento ?? null),
			mensalidadeCombinadaCentavos: data.mensalidadeCombinadaCentavos,
			motivo: data.motivo ?? null,
			status: data.status as Matricula["status"],
			ativo: data.ativo,
			observacoes: data.observacoes ?? null,
		};
	});
});
