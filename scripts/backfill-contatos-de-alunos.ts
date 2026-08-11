/**
 * Uso único: npx tsx scripts/backfill-contatos-de-alunos.ts
 *
 * Antes desta mudança, pessoas criadas fora do dialog "Novo contato" (cadastro manual em
 * Pessoas, importação CSV) nunca ganhavam um `contato` — por isso não apareciam em Vagões.
 * Este script cobre o passado: cria o `contato` retroativo para todo aluno que ainda não
 * tem um (mesma regra de `contatoInicialDeAluno`, usada daqui pra frente na criação).
 */
import "dotenv/config";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { contatoInicialDeAluno } from "../src/core/comunicacao/contatos/contatoDeAluno";

async function main(): Promise<void> {
	const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "";
	const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
	const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

	if (getApps().length === 0) {
		initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
	}

	const firestore = getFirestore();

	const [pessoasSnapshot, contatosSnapshot] = await Promise.all([
		firestore.collection("pessoas").where("tipo", "==", "aluno").get(),
		firestore.collection("contatos").get(),
	]);

	const pessoaIdsComContato = new Set(
		contatosSnapshot.docs
			.map((doc) => (doc.data() as { pessoaId: string | null }).pessoaId)
			.filter((pessoaId): pessoaId is string => pessoaId !== null),
	);

	const pendentes = pessoasSnapshot.docs.filter((doc) => !pessoaIdsComContato.has(doc.id));

	if (pendentes.length === 0) {
		console.log("Nenhum aluno pendente — todos já têm contato.");
		return;
	}

	const batch = firestore.batch();
	pendentes.forEach((doc) => {
		const data = doc.data() as { nome: string; status: string; ativo: boolean };
		const contatoRef = firestore.collection("contatos").doc();
		batch.set(contatoRef, contatoInicialDeAluno({ id: doc.id, nome: data.nome, status: data.status, ativo: data.ativo }));
		console.log(`+ contato para "${data.nome}" (pessoa ${doc.id}, status=${data.status}, ativo=${data.ativo})`);
	});
	await batch.commit();

	console.log(`\n${pendentes.length} contato(s) criado(s).`);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
