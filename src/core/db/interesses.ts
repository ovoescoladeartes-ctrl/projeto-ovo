import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { Interesse } from "@/core/interesses/schema";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface InteresseDoc {
	nome: string;
	ativo: boolean;
	criadoEm?: Timestamp;
}

/** Coleção inteira — `listarInteressesAtivos` filtra por `ativo` em memória; `upsertInteresse` usa a mesma leitura pra checar duplicata (nome normalizado) mesmo entre inativos, igual ao comportamento antes desta migração. */
export const lerInteresses = cacheDeColecao("interesses", "interesses", async (): Promise<Interesse[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("interesses").get();
	registrarLeitura("interesses", snapshot.size);
	return snapshot.docs.map((doc) => {
		const data = doc.data() as InteresseDoc;
		return { id: doc.id, nome: data.nome, ativo: data.ativo, criadoEm: toIso(data.criadoEm ?? null) };
	});
});
