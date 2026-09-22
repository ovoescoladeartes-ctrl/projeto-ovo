import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import type { Repasse } from "@/core/financeiro/repasses/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface RepasseDoc {
	destinoTipo: string;
	destinoPessoaId: string | null;
	turmaId: string | null;
	valorCentavos: number;
	vencimento?: Timestamp;
	status: string;
	origem: string;
	ativo: boolean;
}

/** Coleção inteira — dashboard, pendências e `/caixa` cada um filtra/agrega diferente em memória. */
export const lerRepasses = cacheDeColecao("repasses", "repasses", async (): Promise<Repasse[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("repasses").get();
	registrarLeitura("repasses", snapshot.size);
	return snapshot.docs.map((doc) => {
		const data = doc.data() as RepasseDoc;
		return {
			id: doc.id,
			destinoTipo: data.destinoTipo as Repasse["destinoTipo"],
			destinoPessoaId: data.destinoPessoaId,
			turmaId: data.turmaId,
			valorCentavos: data.valorCentavos,
			vencimento: toIso(data.vencimento ?? null),
			status: data.status as Repasse["status"],
			origem: data.origem as Repasse["origem"],
			ativo: data.ativo,
		};
	});
});
