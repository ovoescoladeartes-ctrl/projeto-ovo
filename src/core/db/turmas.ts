import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { Turma } from "@/core/turmas/schema";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface TurmaDoc {
	nome: string;
	assunto?: string;
	tipo?: Turma["tipo"];
	mensalidadeCentavos: number;
	repasseTipo: string;
	repasseValor: number;
	dataInicio?: Timestamp;
	dataFim?: Timestamp | null;
	educadorPessoaId: string | null;
	capacidadeMaxima?: number | null;
	ativo: boolean;
	wixProductId?: string | null;
	origem?: Turma["origem"];
}

/** Coleção inteira — mesma razão de `lerPessoas`: consumidores diferentes precisam de recortes diferentes de ativo/inativo. */
export const lerTurmas = cacheDeColecao("turmas", "turmas", async (): Promise<Turma[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("turmas").get();
	registrarLeitura("turmas", snapshot.size);
	return snapshot.docs.map((doc) => {
		const data = doc.data() as TurmaDoc;
		return {
			id: doc.id,
			nome: data.nome,
			assunto: data.assunto ?? "",
			tipo: data.tipo ?? null,
			mensalidadeCentavos: data.mensalidadeCentavos,
			repasseTipo: data.repasseTipo as Turma["repasseTipo"],
			repasseValor: data.repasseValor,
			dataInicio: toIso(data.dataInicio ?? null),
			dataFim: toIso(data.dataFim ?? null),
			educadorPessoaId: data.educadorPessoaId ?? null,
			capacidadeMaxima: data.capacidadeMaxima ?? null,
			ativo: data.ativo,
			wixProductId: data.wixProductId ?? null,
			origem: data.origem ?? "manual",
		};
	});
});
