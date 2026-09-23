import "server-only";

import type { Mensagem, MensagemCategoria } from "@/core/comunicacao/mensagens/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface MensagemDoc {
	categoria: string;
	titulo: string;
	texto: string;
	ativo: boolean;
}

/** Só ativas — nenhum consumidor (`/mensagens`, `/vagoes`) precisa de mensagem inativa. */
export const lerMensagensAtivas = cacheDeColecao("mensagensAtivas", "mensagens", async (): Promise<Mensagem[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("mensagens").where("ativo", "==", true).get();
	registrarLeitura("mensagensAtivas", snapshot.size);
	return snapshot.docs.map((doc) => {
		const data = doc.data() as MensagemDoc;
		return {
			id: doc.id,
			categoria: data.categoria as MensagemCategoria,
			titulo: data.titulo,
			texto: data.texto,
			ativo: data.ativo,
		};
	});
});
