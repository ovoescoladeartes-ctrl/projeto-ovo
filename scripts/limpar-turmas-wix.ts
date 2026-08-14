/**
 * Uso: npx tsx scripts/limpar-turmas-wix.ts [--apply]
 *
 * Limpeza retroativa, de uso único, das 16 Turmas vindas do sync Wix cujo `nome` mistura data +
 * tipo de atividade + título numa string só (ex.: "12/SET - OFICINA Jogo, Palavra e Presença:
 * Ferramentas para Contação de história"), com `assunto` gravado como cópia idêntica de `nome`
 * (bug corrigido em `admin/wix-sync/actions.ts`/`src/core/wix/sync.ts` nesta mesma leva de
 * mudanças — ver `limparNomeTurmaWix`). Diferente do sync (que usa um parser genérico pra nomes
 * ainda não vistos), aqui a tabela abaixo é FIXA — as 16 linhas já foram revisadas uma a uma com
 * o Rogério antes de escrever este script, não é uma tentativa de adivinhar de novo.
 *
 * Ano das datas extraídas: 2026 (decisão do Rogério, os nomes da Wix nunca incluem ano).
 * `assunto` fica em branco em 2 linhas onde não havia segurança pra chutar a categoria — fica
 * pra alguém da escola preencher depois pela tela de editar turma.
 *
 * Efeito colateral: as 2 turmas manuais antigas (sem `origem` gravado no documento) recebem
 * `origem: "manual"` — não são turmas da Wix, só estavam com o campo ausente.
 *
 * Sem `--apply`, roda em modo dry-run — só imprime o que faria. Requer as mesmas variáveis de
 * ambiente do Admin SDK (.env: FIREBASE_ADMIN_*).
 */
import "dotenv/config";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

interface TurmaAjuste {
	id: string;
	nomeAtualEsperado: string;
	tipo: "curso" | "oficina" | null;
	dataInicio: string | null; // YYYY-MM-DD
	nomeNovo: string;
	assuntoNovo: string;
}

const TURMAS: TurmaAjuste[] = [
	{
		id: "1IlqBj0PGyOeSFxplXbr",
		nomeAtualEsperado: "CURSO - ATELIÊ CRIATIVO",
		tipo: "curso",
		dataInicio: null,
		nomeNovo: "Ateliê Criativo",
		assuntoNovo: "Ateliê Criativo",
	},
	{
		id: "3NKXGmdp0MiFTr8Sr58c",
		nomeAtualEsperado: "CURSO DE PALHAÇARIA - INTERMEDIÁRIO",
		tipo: "curso",
		dataInicio: null,
		nomeNovo: "Palhaçaria - Intermediário",
		assuntoNovo: "Palhaçaria",
	},
	{
		id: "8wYjzp9xklzoVGGNXnrl",
		nomeAtualEsperado: "13/JUN - OFICINA Aquarela Botânica",
		tipo: "oficina",
		dataInicio: "2026-06-13",
		nomeNovo: "Aquarela Botânica",
		assuntoNovo: "Aquarela",
	},
	{
		id: "Bkq8W6kvDolvNc6iBNwY",
		nomeAtualEsperado: "CURSO de Modelagem e Cerâmica",
		tipo: "curso",
		dataInicio: null,
		nomeNovo: "Modelagem e Cerâmica",
		assuntoNovo: "Cerâmica",
	},
	{
		id: "ENwKe0ep9Y8cFQbcWM9E",
		nomeAtualEsperado: "17/OUT - OFICINA ENTRE NÓS - Macramê",
		tipo: "oficina",
		dataInicio: "2026-10-17",
		nomeNovo: "Entre Nós - Macramê",
		assuntoNovo: "Macramê",
	},
	{
		id: "HDKmhM0lwfXDZ92ZloCt",
		nomeAtualEsperado: "CURSO DE PALHAÇARIA - INICIANTE",
		tipo: "curso",
		dataInicio: null,
		nomeNovo: "Palhaçaria - Iniciante",
		assuntoNovo: "Palhaçaria",
	},
	{
		id: "JYAmqMkjrd4NNcqc92kA",
		nomeAtualEsperado: "CURSO DE PINTURA EM TELA",
		tipo: "curso",
		dataInicio: null,
		nomeNovo: "Pintura em Tela",
		assuntoNovo: "Pintura",
	},
	{
		id: "VfDv9AdUCKbui435S80p",
		nomeAtualEsperado: "CURSO: Pintura em tecido & Upcycling",
		tipo: "curso",
		dataInicio: null,
		nomeNovo: "Pintura em Tecido & Upcycling",
		assuntoNovo: "Pintura em Tecido",
	},
	{
		id: "Ws2wRSpM5spuxxg6HgcI",
		nomeAtualEsperado: "16/JUL - OFICINA Jogo, Palavra e Presença: Ferramentas para Contação de História",
		tipo: "oficina",
		dataInicio: "2026-07-16",
		nomeNovo: "Jogo, Palavra e Presença: Ferramentas para Contação de História",
		assuntoNovo: "Contação de História",
	},
	{
		id: "YHHF2bhjvyRhFVoW36Z1",
		nomeAtualEsperado: "29/AGO OFICINA: Sotaques corporais - dança afro diaspórica",
		tipo: "oficina",
		dataInicio: "2026-08-29",
		nomeNovo: "Sotaques Corporais - Dança Afro Diaspórica",
		assuntoNovo: "Dança",
	},
	{
		id: "mmQpi7I1Q8MwUtfIWzKl",
		nomeAtualEsperado: "CURSO DE CRIAÇÃO TEXTIL",
		tipo: "curso",
		dataInicio: null,
		nomeNovo: "Criação Têxtil",
		assuntoNovo: "Têxtil",
	},
	{
		id: "p8xvg8g4QueDrtXTpoca",
		nomeAtualEsperado: "CURSO PINTURA EM AZULEJO",
		tipo: "curso",
		dataInicio: null,
		nomeNovo: "Pintura em Azulejo",
		assuntoNovo: "Pintura",
	},
	{
		id: "pdsr81FI5frbjB4yttMq",
		nomeAtualEsperado: "12/SET - OFICINA Jogo, Palavra e Presença: Ferramentas para Contação de história",
		tipo: "oficina",
		dataInicio: "2026-09-12",
		nomeNovo: "Jogo, Palavra e Presença: Ferramentas para Contação de História",
		assuntoNovo: "Contação de História",
	},
	{
		id: "sbhWRbrtFzTkQcz4VR4k",
		nomeAtualEsperado: "15/AGO - OFICINA Criação de Personagens",
		tipo: "oficina",
		dataInicio: "2026-08-15",
		nomeNovo: "Criação de Personagens",
		assuntoNovo: "",
	},
	{
		id: "tA2wXbSu4NOccCAjGHrm",
		nomeAtualEsperado: "25/JUL OFICINA: Cerâmica - Vaso de cordas",
		tipo: "oficina",
		dataInicio: "2026-07-25",
		nomeNovo: "Cerâmica - Vaso de Cordas",
		assuntoNovo: "Cerâmica",
	},
	{
		id: "vnGdQWdzU3eDF3MNPNgT",
		nomeAtualEsperado: "Roda de Conversa (Faço parte)",
		tipo: null,
		dataInicio: null,
		nomeNovo: "Roda de Conversa (Faço parte)",
		assuntoNovo: "",
	},
];

/** Turmas manuais antigas sem `origem` gravada no documento — só recebem o backfill desse campo. */
const IDS_ORIGEM_MANUAL_FALTANDO = ["P7Z4g9rRwHBNL4qTZRWB", "YVzbXEyt1BTO6ijVf2rg"];

interface TurmaDocAtual {
	nome?: string;
	assunto?: string;
	tipo?: string | null;
	origem?: string;
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

	console.log("== Turmas Wix: nome/assunto/tipo/dataInicio ==");
	let batch = firestore.batch();
	let operacoesNoBatch = 0;
	let alterados = 0;
	let pulados = 0;

	for (const ajuste of TURMAS) {
		const ref = firestore.collection("turmas").doc(ajuste.id);
		const doc = await ref.get();
		if (!doc.exists) {
			console.log(`— [PULADO] ${ajuste.id}: documento não existe mais.`);
			pulados += 1;
			continue;
		}
		const atual = doc.data() as TurmaDocAtual;
		if (atual.nome !== ajuste.nomeAtualEsperado) {
			console.log(
				`— [PULADO] ${ajuste.id}: nome atual ("${atual.nome}") não bate com o esperado ` +
					`("${ajuste.nomeAtualEsperado}") — dado pode ter mudado desde a revisão, confira na mão.`,
			);
			pulados += 1;
			continue;
		}

		console.log(`— ${ajuste.nomeAtualEsperado}`);
		console.log(`  nome:     "${ajuste.nomeAtualEsperado}" → "${ajuste.nomeNovo}"`);
		console.log(`  assunto:  "${atual.assunto ?? ""}" → "${ajuste.assuntoNovo}"`);
		console.log(`  tipo:     ${atual.tipo ?? "null"} → ${ajuste.tipo ?? "null"}`);
		console.log(`  início:   → ${ajuste.dataInicio ?? "(sem data)"}`);

		alterados += 1;
		if (aplicar) {
			batch.set(
				ref,
				{
					nome: ajuste.nomeNovo,
					assunto: ajuste.assuntoNovo,
					tipo: ajuste.tipo,
					...(ajuste.dataInicio !== null ? { dataInicio: new Date(ajuste.dataInicio) } : {}),
				},
				{ merge: true },
			);
			operacoesNoBatch += 1;
		}
	}

	console.log("\n== Turmas manuais antigas: backfill de origem ==");
	for (const id of IDS_ORIGEM_MANUAL_FALTANDO) {
		const ref = firestore.collection("turmas").doc(id);
		const doc = await ref.get();
		if (!doc.exists) {
			console.log(`— [PULADO] ${id}: documento não existe mais.`);
			continue;
		}
		const atual = doc.data() as TurmaDocAtual;
		if (atual.origem !== undefined) {
			console.log(`— [PULADO] ${id} (${atual.nome}): já tem origem "${atual.origem}", não mexe.`);
			continue;
		}
		console.log(`— ${atual.nome}: origem (vazio) → "manual"`);
		if (aplicar) {
			batch.set(ref, { origem: "manual" }, { merge: true });
			operacoesNoBatch += 1;
		}
	}

	if (aplicar && operacoesNoBatch > 0) {
		await batch.commit();
	}

	console.log(`\n${alterados} turma(s) ${aplicar ? "atualizada(s)" : "seriam atualizadas"}, ${pulados} pulada(s).`);
	console.log(aplicar ? "Aplicado." : "Modo dry-run — nada foi escrito. Rode de novo com --apply pra gravar.");
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
