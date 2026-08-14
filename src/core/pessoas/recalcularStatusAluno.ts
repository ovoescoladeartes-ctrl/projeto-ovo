import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import type { StatusAluno } from "./schema";

interface PessoaAlunoDoc {
	ehAluno: boolean;
	statusAluno: string | null;
}

/**
 * Aluno fica "matriculado" se, e somente se, tiver pelo menos uma Matrícula ativa. Sem matrícula
 * ativa: "ex_aluno" se já teve alguma Matrícula algum dia (ativa ou encerrada) — diferencia quem
 * já passou pelo programa de quem ainda não converteu; "lead" só quando nunca teve nenhuma.
 * Chamada sempre que uma Matrícula pode ter mudado de status (matricular, encerrar, restaurar) —
 * nunca editado manualmente. Espelha `recalcularStatusProfessor`, que faz o mesmo pro papel de
 * Professor a partir de ser educador de Turma ativa.
 *
 * Retorna o status novo (`null` se a pessoa não existe ou não é aluno) pra quem chama poder
 * reagir — ver `encerrarMatricula`/`restaurarMatricula`, que sincronizam o Contato vinculado
 * (Vagões) quando o resultado vira "ex_aluno" ou volta a ser "matriculado".
 */
export async function recalcularStatusAluno(firestore: Firestore, pessoaId: string): Promise<StatusAluno | null> {
	const pessoaRef = firestore.collection("pessoas").doc(pessoaId);

	return firestore.runTransaction(async (tx) => {
		const pessoaDoc = await tx.get(pessoaRef);
		if (!pessoaDoc.exists) {
			return null;
		}

		const pessoaData = pessoaDoc.data() as PessoaAlunoDoc;
		if (!pessoaData.ehAluno) {
			return null;
		}

		const matriculasAtivasSnapshot = await tx.get(
			firestore.collection("matriculas").where("pessoaId", "==", pessoaId).where("status", "==", "ativa").limit(1),
		);

		let novoStatus: StatusAluno;
		if (!matriculasAtivasSnapshot.empty) {
			novoStatus = "matriculado";
		} else {
			const algumaMatriculaSnapshot = await tx.get(
				firestore.collection("matriculas").where("pessoaId", "==", pessoaId).limit(1),
			);
			novoStatus = algumaMatriculaSnapshot.empty ? "lead" : "ex_aluno";
		}

		if (novoStatus !== pessoaData.statusAluno) {
			tx.set(pessoaRef, { statusAluno: novoStatus }, { merge: true });
		}

		return novoStatus;
	});
}
