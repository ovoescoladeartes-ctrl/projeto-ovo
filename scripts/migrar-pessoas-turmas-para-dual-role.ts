/**
 * Uso único: npx tsx scripts/migrar-pessoas-turmas-para-dual-role.ts
 *
 * O PR de "papel duplo" (main, PRs #10/#11) mudou Pessoa (tipo/status ->
 * ehAluno/ehProfessor/statusAluno/statusProfessor) e Turma (assunto virou
 * obrigatório) DEPOIS que o sync da Wix já tinha gravado 55 Pessoas e 16
 * Turmas em produção no formato antigo. Este script corrige só esses
 * registros — identificados por wixContactId/wixProductId — pro formato
 * novo, sem tocar em nada criado manualmente. Idempotente: pula quem já
 * tem `ehAluno`/`assunto` definidos.
 */
import "dotenv/config";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

async function main(): Promise<void> {
	const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "";
	const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
	const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

	if (getApps().length === 0) {
		initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
	}

	const firestore = getFirestore();

	const [pessoasSnapshot, turmasSnapshot] = await Promise.all([
		firestore.collection("pessoas").get(),
		firestore.collection("turmas").get(),
	]);

	let pessoasMigradas = 0;
	let pessoasJaOk = 0;
	const batchPessoas = firestore.batch();

	pessoasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as { wixContactId?: string | null; status?: string; ehAluno?: boolean };
		if (!data.wixContactId) {
			return; // não veio do sync Wix, não mexe.
		}
		if (data.ehAluno !== undefined) {
			pessoasJaOk += 1;
			return; // já migrado (idempotência).
		}

		batchPessoas.set(
			doc.ref,
			{
				ehAluno: true,
				ehProfessor: false,
				statusAluno: data.status ?? "lead",
				statusProfessor: null,
				numeroMatriculaAluno: null,
				numeroMatriculaProfessor: null,
				interesses: [],
				tipo: FieldValue.delete(),
				status: FieldValue.delete(),
			},
			{ merge: true },
		);
		pessoasMigradas += 1;
	});

	let turmasMigradas = 0;
	let turmasJaOk = 0;
	const batchTurmas = firestore.batch();

	turmasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as { wixProductId?: string | null; nome: string; assunto?: string };
		if (!data.wixProductId) {
			return;
		}
		if (data.assunto !== undefined) {
			turmasJaOk += 1;
			return;
		}

		batchTurmas.set(doc.ref, { assunto: data.nome, capacidadeMaxima: null }, { merge: true });
		turmasMigradas += 1;
	});

	if (pessoasMigradas > 0) {
		await batchPessoas.commit();
	}
	if (turmasMigradas > 0) {
		await batchTurmas.commit();
	}

	console.log(`Pessoas: ${pessoasMigradas} migradas, ${pessoasJaOk} já estavam ok.`);
	console.log(`Turmas: ${turmasMigradas} migradas, ${turmasJaOk} já estavam ok.`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
