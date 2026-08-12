import "server-only";

import type { Firestore } from "firebase-admin/firestore";

interface PessoaAlunoDoc {
	ehAluno: boolean;
	statusAluno: string | null;
}

/**
 * Aluno fica "matriculado" se, e somente se, tiver pelo menos uma Matrícula ativa — caso
 * contrário "lead", mesmo que já tenha sido matriculado antes (a matrícula pode ter sido
 * encerrada). Chamada sempre que uma Matrícula pode ter mudado de status (matricular, encerrar,
 * restaurar) — nunca editado manualmente. Espelha `recalcularStatusProfessor`, que faz o mesmo
 * pro papel de Professor a partir de ser educador de Turma ativa.
 */
export async function recalcularStatusAluno(firestore: Firestore, pessoaId: string): Promise<void> {
	const pessoaRef = firestore.collection("pessoas").doc(pessoaId);

	await firestore.runTransaction(async (tx) => {
		const pessoaDoc = await tx.get(pessoaRef);
		if (!pessoaDoc.exists) {
			return;
		}

		const pessoaData = pessoaDoc.data() as PessoaAlunoDoc;
		if (!pessoaData.ehAluno) {
			return;
		}

		const matriculasAtivasSnapshot = await tx.get(
			firestore.collection("matriculas").where("pessoaId", "==", pessoaId).where("status", "==", "ativa").limit(1),
		);
		const novoStatus = matriculasAtivasSnapshot.empty ? "lead" : "matriculado";

		if (novoStatus !== pessoaData.statusAluno) {
			tx.set(pessoaRef, { statusAluno: novoStatus }, { merge: true });
		}
	});
}
