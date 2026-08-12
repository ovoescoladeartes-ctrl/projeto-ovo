/**
 * Uso: npx tsx scripts/reconciliar-matriculas-duplicadas.ts [--apply]
 *
 * Regra revisada (round 3): só pode existir um único registro de matrícula por par
 * (pessoaId, turmaId) — nunca mais de um, mesmo depois de reentradas (ver `matricular()` em
 * `src/app/(protected)/pessoas/[id]/actions.ts`, que agora reaproveita o registro existente em
 * vez de criar um novo). E `statusAluno` passou a ser sempre recalculado a partir de existir ou
 * não matrícula ativa (ver `recalcularStatusAluno`), em vez de só avançar (lead → matriculado)
 * e nunca voltar.
 *
 * Este script, de uso único, faz as duas reconciliações nos dados que já existiam antes dessas
 * correções:
 *   1. Duplicatas — pra cada par (pessoaId, turmaId) com mais de um registro, mantém um só.
 *   2. Status desatualizado — recalcula `statusAluno` de toda pessoa-aluno a partir de ter ou
 *      não matrícula ativa. Independente da etapa 1: "existe algum registro ativo" já dá o
 *      resultado certo mesmo antes de deduplicar, já que duplicata não muda se existe ou não
 *      uma matrícula ativa pra aquela pessoa.
 *
 * Sem `--apply`, roda em modo dry-run — só imprime o que faria, não escreve nada. Passe `--apply`
 * pra gravar de verdade. Requer as mesmas variáveis de ambiente do Admin SDK (.env: FIREBASE_ADMIN_*).
 */
import "dotenv/config";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type QueryDocumentSnapshot, type Timestamp } from "firebase-admin/firestore";

interface MatriculaDoc {
	pessoaId: string;
	turmaId: string;
	status: string;
	dataMatricula?: Timestamp;
	dataEncerramento?: Timestamp | null;
}

interface PessoaDoc {
	nome?: string;
	ehAluno?: boolean;
	statusAluno?: string | null;
}

function maisAntiga(a: Timestamp | undefined, b: Timestamp | undefined): Timestamp | undefined {
	if (a === undefined) return b;
	if (b === undefined) return a;
	return a.toMillis() <= b.toMillis() ? a : b;
}

function maisRecente(a: Timestamp | undefined, b: Timestamp | undefined): Timestamp | undefined {
	if (a === undefined) return b;
	if (b === undefined) return a;
	return a.toMillis() >= b.toMillis() ? a : b;
}

async function main(): Promise<void> {
	const aplicar = process.argv.includes("--apply");

	const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "";
	const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
	const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

	if (!projectId || !clientEmail || !privateKey) {
		console.error("FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY precisam estar no .env.");
		process.exitCode = 1;
		return;
	}

	if (getApps().length === 0) {
		initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
	}

	const firestore = getFirestore();

	const [matriculasSnapshot, pessoasSnapshot, turmasSnapshot] = await Promise.all([
		firestore.collection("matriculas").get(),
		firestore.collection("pessoas").get(),
		firestore.collection("turmas").get(),
	]);

	const nomesPessoas = new Map<string, string>();
	pessoasSnapshot.docs.forEach((doc) => nomesPessoas.set(doc.id, (doc.data() as PessoaDoc).nome ?? "(sem nome)"));
	const nomesTurmas = new Map<string, string>();
	turmasSnapshot.docs.forEach((doc) => nomesTurmas.set(doc.id, (doc.data() as { nome?: string }).nome ?? "(sem nome)"));

	console.log(aplicar ? "Modo: --apply (grava de verdade)\n" : "Modo: dry-run (só imprime, nada é gravado)\n");

	// --- Etapa 1: duplicatas por (pessoaId, turmaId) ---
	const grupos = new Map<string, QueryDocumentSnapshot[]>();
	matriculasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as MatriculaDoc;
		const chave = `${data.pessoaId}__${data.turmaId}`;
		const lista = grupos.get(chave) ?? [];
		lista.push(doc);
		grupos.set(chave, lista);
	});
	const duplicados = Array.from(grupos.entries()).filter(([, docs]) => docs.length > 1);

	console.log(`== Etapa 1: duplicatas ==`);
	if (duplicados.length === 0) {
		console.log("Nenhum par (pessoa, turma) com mais de uma matrícula.\n");
	} else {
		console.log(`${duplicados.length} par(es) com matrícula duplicada.\n`);

		let batch = firestore.batch();
		let operacoesNoBatch = 0;

		for (const [chave, docs] of duplicados) {
			const [pessoaId, turmaId] = chave.split("__");
			const nomesLegiveis = `${nomesPessoas.get(pessoaId ?? "") ?? pessoaId} / ${nomesTurmas.get(turmaId ?? "") ?? turmaId}`;

			const dados = docs.map((doc) => ({ doc, data: doc.data() as MatriculaDoc }));
			const ativas = dados.filter((item) => item.data.status === "ativa");

			let mantidoId: string;
			let dataMatriculaFinal: Timestamp | undefined;
			let dataEncerramentoFinal: Timestamp | null = null;

			if (ativas.length > 0) {
				// Mantém a ativa (se houver mais de uma ativa por engano, mantém a primeira encontrada);
				// data de matrícula final é a mais antiga entre TODAS as duplicadas do par.
				mantidoId = ativas[0]!.doc.id;
				dataMatriculaFinal = dados.reduce<Timestamp | undefined>((acc, item) => maisAntiga(acc, item.data.dataMatricula), undefined);
				dataEncerramentoFinal = null;
			} else {
				// Todas encerradas — mantém a mais recente (por dataEncerramento, com fallback pra dataMatricula).
				const maisRecenteItem = dados.reduce((acc, item) => {
					const chaveAcc = acc.data.dataEncerramento ?? acc.data.dataMatricula;
					const chaveItem = item.data.dataEncerramento ?? item.data.dataMatricula;
					return maisRecente(chaveAcc, chaveItem) === chaveItem ? item : acc;
				});
				mantidoId = maisRecenteItem.doc.id;
				dataMatriculaFinal = maisRecenteItem.data.dataMatricula;
				dataEncerramentoFinal = maisRecenteItem.data.dataEncerramento ?? null;
			}

			const removidos = dados.filter((item) => item.doc.id !== mantidoId);

			console.log(`— ${nomesLegiveis}`);
			console.log(`  mantém: ${mantidoId} (status ${ativas.length > 0 ? "ativa" : "encerrada"})`);
			console.log(`  remove: ${removidos.map((item) => item.doc.id).join(", ")}`);

			if (aplicar) {
				const mantidoRef = firestore.collection("matriculas").doc(mantidoId);
				batch.set(
					mantidoRef,
					{
						status: ativas.length > 0 ? "ativa" : "encerrada",
						dataMatricula: dataMatriculaFinal ?? null,
						dataEncerramento: dataEncerramentoFinal,
					},
					{ merge: true },
				);
				operacoesNoBatch += 1;
				for (const item of removidos) {
					batch.delete(item.doc.ref);
					operacoesNoBatch += 1;
				}
				if (operacoesNoBatch >= 400) {
					await batch.commit();
					batch = firestore.batch();
					operacoesNoBatch = 0;
				}
			}
		}

		if (aplicar && operacoesNoBatch > 0) {
			await batch.commit();
		}
		console.log(`\n${duplicados.length} par(es) reconciliados.\n`);
	}

	// --- Etapa 2: statusAluno desatualizado ---
	console.log(`== Etapa 2: status de aluno ==`);
	const pessoaTemMatriculaAtiva = new Set<string>();
	matriculasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as MatriculaDoc;
		if (data.status === "ativa") {
			pessoaTemMatriculaAtiva.add(data.pessoaId);
		}
	});

	let statusBatch = firestore.batch();
	let statusOperacoes = 0;
	let statusAlterados = 0;

	for (const pessoaDoc of pessoasSnapshot.docs) {
		const data = pessoaDoc.data() as PessoaDoc;
		if (!data.ehAluno) {
			continue;
		}
		const statusCorreto = pessoaTemMatriculaAtiva.has(pessoaDoc.id) ? "matriculado" : "lead";
		if (data.statusAluno === statusCorreto) {
			continue;
		}
		statusAlterados += 1;
		console.log(`— ${data.nome ?? pessoaDoc.id}: "${data.statusAluno ?? "(vazio)"}" → "${statusCorreto}"`);
		if (aplicar) {
			statusBatch.set(pessoaDoc.ref, { statusAluno: statusCorreto }, { merge: true });
			statusOperacoes += 1;
			if (statusOperacoes >= 400) {
				await statusBatch.commit();
				statusBatch = firestore.batch();
				statusOperacoes = 0;
			}
		}
	}

	if (aplicar && statusOperacoes > 0) {
		await statusBatch.commit();
	}

	if (statusAlterados === 0) {
		console.log("Nenhum statusAluno desatualizado.");
	} else {
		console.log(`\n${statusAlterados} pessoa(s) com statusAluno corrigido.`);
	}

	console.log(aplicar ? "\nAplicado." : "\nModo dry-run — nada foi escrito. Rode de novo com --apply pra gravar.");
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
