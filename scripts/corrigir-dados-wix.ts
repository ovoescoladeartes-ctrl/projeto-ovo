/**
 * Uso: npx tsx scripts/corrigir-dados-wix.ts [--apply]
 *
 * Correção retroativa dos dados já trazidos pela sincronização Wix (55 Pessoas / 16 Turmas /
 * 127 Recebimentos, primeira sincronização real em 2026-08-12) — de antes de
 * `confirmarSincronizacaoWix()` (`src/app/(protected)/admin/wix-sync/actions.ts`) passar a criar
 * Matrícula/corrigir `criadoEm` na hora. Três correções, todas derivadas do que já está gravado
 * em `recebimentos` (nenhuma chamada à API da Wix é necessária):
 *
 *   1. "Se pagou, está matriculado" — cria uma Matrícula pra cada par (pessoaId, turmaId) que
 *      tem recebimento `status: "confirmado"` mas ainda não tem nenhuma Matrícula (mesma regra
 *      pura de `planejarMatriculasRetroativas`, `src/core/wix/sync.ts`, usada também pelo sync).
 *   2. `statusAluno` — recalculado (lead ↔ matriculado) a partir de existir ou não Matrícula
 *      ativa, igual à Etapa 2 de `scripts/reconciliar-matriculas-duplicadas.ts`.
 *   3. `criadoEm` — corrigido pra data do recebimento mais antigo (qualquer status) daquela
 *      pessoa, em vez da hora em que o sync rodou.
 *
 * Sem `--apply`, roda em modo dry-run — só imprime o que faria, não escreve nada, inclusive uma
 * lista separada de pendências que o script não resolve sozinho (recebimento confirmado sem
 * turma vinculada; ver "avisos" abaixo). Requer as mesmas variáveis de ambiente do Admin SDK
 * (.env: FIREBASE_ADMIN_*).
 */
import "dotenv/config";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore, type Timestamp } from "firebase-admin/firestore";

import { planejarMatriculasRetroativas, type RecebimentoParaMatricula } from "../src/core/wix/sync";

interface PessoaDoc {
	nome?: string;
	origem?: string;
	ehAluno?: boolean;
	statusAluno?: string | null;
	numeroMatriculaAluno?: string | null;
	criadoEm?: Timestamp | null;
}

interface MatriculaDoc {
	pessoaId: string;
	turmaId: string;
	status: string;
}

interface RecebimentoDoc {
	pessoaId: string;
	turmaId: string | null;
	valorCentavos: number;
	status: string;
	origem?: string;
	dataRecebimento?: Timestamp | null;
}

function isoDoTimestamp(timestamp: Timestamp | null | undefined): string | null {
	return timestamp ? timestamp.toDate().toISOString() : null;
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

	const firestore: Firestore = getFirestore();

	console.log(aplicar ? "Modo: --apply (grava de verdade)\n" : "Modo: dry-run (só imprime, nada é gravado)\n");

	const [pessoasSnapshot, matriculasSnapshot, recebimentosSnapshot] = await Promise.all([
		firestore.collection("pessoas").get(),
		firestore.collection("matriculas").get(),
		firestore.collection("recebimentos").get(),
	]);

	const pessoasPorId = new Map<string, PessoaDoc>();
	pessoasSnapshot.docs.forEach((doc) => pessoasPorId.set(doc.id, doc.data() as PessoaDoc));

	const pessoasWix = [...pessoasPorId.entries()].filter(([, data]) => data.origem === "wix");
	if (pessoasWix.length === 0) {
		console.log("Nenhuma pessoa com origem \"wix\" encontrada — nada a corrigir.");
		return;
	}

	const matriculasExistentesPorPar = new Set<string>();
	const pessoaTemMatriculaAtiva = new Set<string>();
	matriculasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as MatriculaDoc;
		matriculasExistentesPorPar.add(`${data.pessoaId}:${data.turmaId}`);
		if (data.status === "ativa") {
			pessoaTemMatriculaAtiva.add(data.pessoaId);
		}
	});

	const recebimentosWix: (RecebimentoParaMatricula & { turmaIdOriginal: string | null })[] = [];
	recebimentosSnapshot.docs.forEach((doc) => {
		const data = doc.data() as RecebimentoDoc;
		if (data.origem !== "wix") {
			return;
		}
		const dataRecebimento = isoDoTimestamp(data.dataRecebimento);
		if (dataRecebimento === null) {
			return; // sem data, não dá pra usar nem como matrícula nem como criadoEm.
		}
		recebimentosWix.push({
			pessoaId: data.pessoaId,
			turmaId: data.turmaId,
			valorCentavos: data.valorCentavos,
			status: data.status as RecebimentoParaMatricula["status"],
			dataRecebimento,
			turmaIdOriginal: data.turmaId,
		});
	});

	// --- Etapa 1: Matrículas retroativas ---
	console.log("== Etapa 1: Matrículas retroativas (recebimento confirmado ⇒ matrícula) ==");
	const candidatas = planejarMatriculasRetroativas(recebimentosWix).filter(
		(candidata) => !matriculasExistentesPorPar.has(`${candidata.pessoaId}:${candidata.turmaId}`),
	);

	if (candidatas.length === 0) {
		console.log("Nenhuma matrícula retroativa a criar.\n");
	} else {
		const candidatasPorPessoaId = new Map<string, typeof candidatas>();
		candidatas.forEach((candidata) => {
			const lista = candidatasPorPessoaId.get(candidata.pessoaId) ?? [];
			lista.push(candidata);
			candidatasPorPessoaId.set(candidata.pessoaId, lista);
		});

		const contadorRef = firestore.collection("contadores").doc("pessoas");
		let proximoNumero: number | undefined;
		let batch = firestore.batch();
		let operacoesNoBatch = 0;

		for (const [pessoaId, lista] of candidatasPorPessoaId) {
			const nome = pessoasPorId.get(pessoaId)?.nome ?? pessoaId;
			for (const candidata of lista) {
				console.log(
					`— ${nome}: matricula na turma ${candidata.turmaId} em ${candidata.dataMatricula.slice(0, 10)} ` +
						`(R$ ${(candidata.mensalidadeCombinadaCentavos / 100).toFixed(2)})`,
				);
			}

			const numeroAtual = pessoasPorId.get(pessoaId)?.numeroMatriculaAluno ?? null;
			let numeroNovo: string | null = null;
			if (numeroAtual === null) {
				if (proximoNumero === undefined) {
					const contadorDoc = await contadorRef.get();
					const dados = contadorDoc.data() ?? {};
					proximoNumero = (dados.proximoNumeroAluno as number | undefined) ?? (dados.proximoNumero as number | undefined) ?? 1;
				}
				const dataMaisAntiga = lista.reduce((a, b) => (a.dataMatricula <= b.dataMatricula ? a : b)).dataMatricula;
				const ano = new Date(dataMaisAntiga).getFullYear();
				numeroNovo = `A-${ano}-${String(proximoNumero).padStart(4, "0")}`;
				console.log(`  número de matrícula novo: ${numeroNovo}`);
				proximoNumero += 1;
			}

			if (aplicar) {
				lista.forEach((candidata) => {
					batch.set(firestore.collection("matriculas").doc(), {
						pessoaId: candidata.pessoaId,
						turmaId: candidata.turmaId,
						dataMatricula: new Date(candidata.dataMatricula),
						dataEncerramento: null,
						mensalidadeCombinadaCentavos: candidata.mensalidadeCombinadaCentavos,
						motivo: "Matrícula reconstruída a partir da sincronização Wix (correção retroativa).",
						status: "ativa",
						ativo: true,
					});
					operacoesNoBatch += 1;
				});
				if (numeroNovo !== null) {
					batch.set(firestore.collection("pessoas").doc(pessoaId), { numeroMatriculaAluno: numeroNovo }, { merge: true });
					operacoesNoBatch += 1;
				}
				if (operacoesNoBatch >= 400) {
					await batch.commit();
					batch = firestore.batch();
					operacoesNoBatch = 0;
				}
			}

			pessoaTemMatriculaAtiva.add(pessoaId);
		}

		if (aplicar) {
			if (operacoesNoBatch > 0) {
				await batch.commit();
			}
			if (proximoNumero !== undefined) {
				await contadorRef.set({ proximoNumeroAluno: proximoNumero }, { merge: true });
			}
		}
		console.log(`\n${candidatas.length} matrícula(s) ${aplicar ? "criada(s)" : "seriam criadas"}.\n`);
	}

	// Pendências: recebimento confirmado sem turma resolvida — não dá pra criar matrícula sem
	// saber qual turma, precisa de revisão manual (associar wixProductId na Turma certa e rodar
	// o script de novo).
	const semTurmaResolvida = recebimentosWix.filter((r) => r.status === "confirmado" && r.turmaIdOriginal === null);
	if (semTurmaResolvida.length > 0) {
		console.log("== Pendências: recebimento confirmado sem turma vinculada (revisão manual) ==");
		semTurmaResolvida.forEach((r) => {
			const nome = pessoasPorId.get(r.pessoaId)?.nome ?? r.pessoaId;
			console.log(`— ${nome}: recebimento de R$ ${(r.valorCentavos / 100).toFixed(2)} em ${r.dataRecebimento.slice(0, 10)}`);
		});
		console.log("");
	}

	// --- Etapa 2: statusAluno ---
	console.log("== Etapa 2: statusAluno (lead ⇄ matriculado) ==");
	let statusBatch = firestore.batch();
	let statusOperacoes = 0;
	let statusAlterados = 0;

	for (const [pessoaId, data] of pessoasWix) {
		if (!data.ehAluno) {
			continue;
		}
		const statusCorreto = pessoaTemMatriculaAtiva.has(pessoaId) ? "matriculado" : "lead";
		if (data.statusAluno === statusCorreto) {
			continue;
		}
		statusAlterados += 1;
		console.log(`— ${data.nome ?? pessoaId}: "${data.statusAluno ?? "(vazio)"}" → "${statusCorreto}"`);
		if (aplicar) {
			statusBatch.set(firestore.collection("pessoas").doc(pessoaId), { statusAluno: statusCorreto }, { merge: true });
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
	console.log(statusAlterados === 0 ? "Nenhum statusAluno a corrigir.\n" : `\n${statusAlterados} pessoa(s) com statusAluno corrigido.\n`);

	// --- Etapa 3: criadoEm ---
	console.log("== Etapa 3: criadoEm (data do primeiro recebimento na Wix) ==");
	const dataMaisAntigaPorPessoaId = new Map<string, string>();
	recebimentosWix.forEach((r) => {
		const atual = dataMaisAntigaPorPessoaId.get(r.pessoaId);
		if (atual === undefined || r.dataRecebimento < atual) {
			dataMaisAntigaPorPessoaId.set(r.pessoaId, r.dataRecebimento);
		}
	});

	let criadoEmBatch = firestore.batch();
	let criadoEmOperacoes = 0;
	let criadoEmAlterados = 0;

	for (const [pessoaId, data] of pessoasWix) {
		const dataCorreta = dataMaisAntigaPorPessoaId.get(pessoaId);
		if (dataCorreta === undefined) {
			continue; // pessoa wix sem nenhum recebimento — não deveria acontecer (sync só cria pessoa a partir de order), mas não força nada aqui.
		}
		const criadoEmAtual = isoDoTimestamp(data.criadoEm);
		if (criadoEmAtual !== null && criadoEmAtual.slice(0, 19) === dataCorreta.slice(0, 19)) {
			continue;
		}
		criadoEmAlterados += 1;
		console.log(`— ${data.nome ?? pessoaId}: "${criadoEmAtual ?? "(vazio)"}" → "${dataCorreta}"`);
		if (aplicar) {
			criadoEmBatch.set(firestore.collection("pessoas").doc(pessoaId), { criadoEm: new Date(dataCorreta) }, { merge: true });
			criadoEmOperacoes += 1;
			if (criadoEmOperacoes >= 400) {
				await criadoEmBatch.commit();
				criadoEmBatch = firestore.batch();
				criadoEmOperacoes = 0;
			}
		}
	}
	if (aplicar && criadoEmOperacoes > 0) {
		await criadoEmBatch.commit();
	}
	console.log(criadoEmAlterados === 0 ? "Nenhum criadoEm a corrigir.\n" : `\n${criadoEmAlterados} pessoa(s) com criadoEm corrigido.\n`);

	// --- Etapa 4: sincronizar Contato (Vagões) pra quem virou matriculado ---
	console.log("== Etapa 4: Contato (Vagões) → \"convertido\" pra quem virou matriculado ==");
	const contatosSnapshot = await firestore.collection("contatos").get();
	const contatoRefPorPessoaId = new Map<string, FirebaseFirestore.DocumentReference>();
	const estagioPorPessoaId = new Map<string, string>();
	contatosSnapshot.docs.forEach((doc) => {
		const data = doc.data() as { pessoaId?: string; estagio?: string };
		if (data.pessoaId) {
			contatoRefPorPessoaId.set(data.pessoaId, doc.ref);
			estagioPorPessoaId.set(data.pessoaId, data.estagio ?? "");
		}
	});

	let contatoBatch = firestore.batch();
	let contatoOperacoes = 0;
	let contatoAlterados = 0;

	for (const pessoaId of pessoaTemMatriculaAtiva) {
		if (!pessoasWix.some(([id]) => id === pessoaId)) {
			continue;
		}
		const ref = contatoRefPorPessoaId.get(pessoaId);
		if (ref === undefined || estagioPorPessoaId.get(pessoaId) === "convertido") {
			continue;
		}
		contatoAlterados += 1;
		console.log(`— ${pessoasPorId.get(pessoaId)?.nome ?? pessoaId}: contato → "convertido"`);
		if (aplicar) {
			contatoBatch.set(ref, { estagio: "convertido", arquivadoMotivo: null }, { merge: true });
			contatoOperacoes += 1;
			if (contatoOperacoes >= 400) {
				await contatoBatch.commit();
				contatoBatch = firestore.batch();
				contatoOperacoes = 0;
			}
		}
	}
	if (aplicar && contatoOperacoes > 0) {
		await contatoBatch.commit();
	}
	console.log(contatoAlterados === 0 ? "Nenhum contato a corrigir.\n" : `\n${contatoAlterados} contato(s) corrigido(s).\n`);

	console.log(aplicar ? "Aplicado." : "Modo dry-run — nada foi escrito. Rode de novo com --apply pra gravar.");
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
