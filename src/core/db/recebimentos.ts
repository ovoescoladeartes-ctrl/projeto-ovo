import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface RecebimentoDoc {
	pessoaId: string;
	turmaId: string | null;
	matriculaId: string | null;
	valorCentavos: number;
	formaPagamento: string;
	origem: string;
	status: string;
	dataRecebimento?: Timestamp;
	ativo: boolean;
	wixOrderId?: string | null;
	wixLineItemId?: string | null;
}

/** Coleção inteira — dashboard, pendências e `/caixa` cada um filtra/agrega diferente em memória. */
export const lerRecebimentos = cacheDeColecao("recebimentos", "recebimentos", async (): Promise<Recebimento[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("recebimentos").get();
	registrarLeitura("recebimentos", snapshot.size);
	return snapshot.docs.map((doc) => {
		const data = doc.data() as RecebimentoDoc;
		return {
			id: doc.id,
			pessoaId: data.pessoaId,
			turmaId: data.turmaId,
			matriculaId: data.matriculaId,
			valorCentavos: data.valorCentavos,
			formaPagamento: data.formaPagamento as Recebimento["formaPagamento"],
			origem: data.origem as Recebimento["origem"],
			status: data.status as Recebimento["status"],
			dataRecebimento: toIso(data.dataRecebimento ?? null),
			ativo: data.ativo,
			wixOrderId: data.wixOrderId ?? null,
			wixLineItemId: data.wixLineItemId ?? null,
		};
	});
});
