import "server-only";

const COLECAO = "checklistComunicacaoDias";

interface EstadoItemDoc {
	concluido: boolean;
}

interface ChecklistDiaDoc {
	contatos?: Record<string, EstadoItemDoc>;
}

/**
 * Materializa (upsert transacional, idempotente) cada contato de `pendentesIds` que ainda não tem
 * entrada no doc do dia, com `concluido:false` — sem isso, um contato nunca marcado não deixaria
 * rastro pros dias seguintes saberem que ele já estava pendente e migrar pra "Pendências
 * anteriores". O Ritual financeiro não precisa disso porque seus itens são um conjunto fixo
 * conhecido de antemão; aqui o conjunto é dinâmico.
 *
 * Roda dentro de uma transação porque esta função só escreve os ids que **ela mesma** confirma
 * estarem ausentes no momento do commit — sem isso, uma leitura desatualizada poderia sobrescrever
 * com `concluido:false` uma conclusão genuína que acabou de chegar por `alternarItemChecklistComunicacao`
 * (mesmo contato, mesmo dia). O SDK do Firestore já reexecuta a transação sozinho se o doc mudar
 * entre a leitura e o commit, então uma corrida com o toggle nunca perde a marcação real.
 *
 * Retorna quantos ids foram de fato semeados — quem chama só precisa invalidar o cache
 * (`revalidarColecoes(["checklistComunicacaoDias"])`) quando algo mudou de verdade.
 */
export async function materializarChecklistDoDia(
	firestore: FirebaseFirestore.Firestore,
	dia: string,
	pendentesIds: readonly string[],
): Promise<number> {
	if (pendentesIds.length === 0) {
		return 0;
	}

	const docRef = firestore.collection(COLECAO).doc(dia);
	return firestore.runTransaction(async (tx) => {
		const snapshot = await tx.get(docRef);
		const existentes = (snapshot.exists ? (snapshot.data() as ChecklistDiaDoc) : undefined)?.contatos ?? {};
		const faltantes = pendentesIds.filter((id) => existentes[id] === undefined);
		if (faltantes.length === 0) {
			return 0;
		}

		const seed: Record<string, EstadoItemDoc> = {};
		faltantes.forEach((id) => {
			seed[`contatos.${id}`] = { concluido: false };
		});
		tx.set(docRef, seed, { merge: true });
		return faltantes.length;
	});
}
