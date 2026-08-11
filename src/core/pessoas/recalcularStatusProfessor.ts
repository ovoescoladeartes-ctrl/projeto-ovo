import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import { gerarProximoNumeroMatricula } from "./numeroMatricula";

interface PessoaProfessorDoc {
	ehProfessor: boolean;
	statusProfessor: string | null;
	numeroMatriculaProfessor?: string | null;
}

/**
 * Professor fica "ativo" se, e somente se, for educador de pelo menos uma Turma ativa —
 * caso contrário "banco_talentos". Chamada sempre que um vínculo educador↔turma pode ter mudado
 * (criar/editar/arquivar Turma) — nunca editado manualmente. Na primeira vez que o status vira
 * "ativo", também gera o número `P-AAAA-NNNN` (se ainda não tiver um), na mesma transação.
 */
export async function recalcularStatusProfessor(firestore: Firestore, pessoaId: string): Promise<void> {
	const pessoaRef = firestore.collection("pessoas").doc(pessoaId);
	const contadorRef = firestore.collection("contadores").doc("pessoas");

	await firestore.runTransaction(async (tx) => {
		const pessoaDoc = await tx.get(pessoaRef);
		if (!pessoaDoc.exists) {
			return;
		}

		const pessoaData = pessoaDoc.data() as PessoaProfessorDoc;
		if (!pessoaData.ehProfessor) {
			return;
		}

		const turmasAtivasSnapshot = await tx.get(
			firestore.collection("turmas").where("educadorPessoaId", "==", pessoaId).where("ativo", "==", true).limit(1),
		);
		const novoStatus = turmasAtivasSnapshot.empty ? "banco_talentos" : "ativo";

		const update: Record<string, unknown> = {};
		if (novoStatus !== pessoaData.statusProfessor) {
			update.statusProfessor = novoStatus;
		}
		if (
			novoStatus === "ativo" &&
			(pessoaData.numeroMatriculaProfessor === null || pessoaData.numeroMatriculaProfessor === undefined)
		) {
			update.numeroMatriculaProfessor = await gerarProximoNumeroMatricula(
				tx,
				contadorRef,
				new Date().getFullYear(),
				"professor",
			);
		}

		if (Object.keys(update).length > 0) {
			tx.set(pessoaRef, update, { merge: true });
		}
	});
}
