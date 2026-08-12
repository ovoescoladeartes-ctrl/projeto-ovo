"use server";

import { parse } from "csv-parse/sync";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import { contatoInicialDeAluno } from "@/core/comunicacao/contatos/contatoDeAluno";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { ALUNO_STATUS, PROFESSOR_STATUS } from "@/core/pessoas/schema";

export interface LinhaPreview {
	linha: number;
	nome: string;
	tipo: string;
	turma: string;
	status: string;
	erro: string | null;
	duplicataProvavel: boolean;
}

export interface PreviewResult {
	status: "ok" | "error";
	message?: string;
	linhas?: LinhaPreview[];
	totalValidas?: number;
}

export interface ConfirmResult {
	status: "ok" | "error";
	message?: string;
	importadas?: number;
}

interface LinhaCsv {
	nome?: string;
	tipo?: string;
	turma?: string;
	status?: string;
	especialidade?: string;
	email?: string;
	telefone?: string;
}

type PapelCsv = "aluno" | "professor";

interface LinhaValidada {
	linha: number;
	nome: string;
	papeis: PapelCsv[];
	statusAluno: string | null;
	statusProfessor: string | null;
	turmaIds: string[];
	turmaNomes: string[];
	especialidade: string;
	email: string | null;
	telefone: string | null;
	erro: string | null;
}

function parseCsv(texto: string): LinhaCsv[] {
	return parse<LinhaCsv>(texto, { columns: true, skip_empty_lines: true, trim: true });
}

/**
 * `"colaborador"` é o valor histórico da coluna, aceito como sinônimo de `"professor"`.
 * `"A&P"` é papel duplo (aluno + professor na mesma linha) — não existia antes.
 */
function papeisDeTipoCsv(tipoRaw: string): PapelCsv[] | null {
	const normalizado = tipoRaw.trim().toLowerCase();
	if (normalizado === "aluno") {
		return ["aluno"];
	}
	if (normalizado === "professor" || normalizado === "colaborador") {
		return ["professor"];
	}
	if (normalizado === "a&p") {
		return ["aluno", "professor"];
	}
	return null;
}

/**
 * Um único campo `status` cobre os dois papéis quando a linha é A&P: o valor é testado contra o
 * conjunto válido de cada papel presente na linha, e aplicado ao que bater. Papel sem valor
 * correspondente (ou status vazio) cai no default de sempre (lead/banco_talentos). Se o valor não
 * bater com nenhum papel presente, é erro — igual ao comportamento anterior de papel único.
 */
function resolverStatusPorPapel(
	statusRaw: string,
	papeis: PapelCsv[],
): { statusAluno: string | null; statusProfessor: string | null; erro: string | null } {
	const ehAluno = papeis.includes("aluno");
	const ehProfessor = papeis.includes("professor");

	if (statusRaw === "") {
		return {
			statusAluno: ehAluno ? "lead" : null,
			statusProfessor: ehProfessor ? "banco_talentos" : null,
			erro: null,
		};
	}

	const bateAluno = ehAluno && (ALUNO_STATUS as readonly string[]).includes(statusRaw);
	const bateProfessor = ehProfessor && (PROFESSOR_STATUS as readonly string[]).includes(statusRaw);

	if (!bateAluno && !bateProfessor) {
		return { statusAluno: null, statusProfessor: null, erro: `Status inválido para ${papeis.join("/")}: "${statusRaw}".` };
	}

	return {
		statusAluno: bateAluno ? statusRaw : ehAluno ? "lead" : null,
		statusProfessor: bateProfessor ? statusRaw : ehProfessor ? "banco_talentos" : null,
		erro: null,
	};
}

function linhaComErro(numeroLinha: number, nome: string, turmaRaw: string, erro: string): LinhaValidada {
	return {
		linha: numeroLinha,
		nome,
		papeis: ["aluno"],
		statusAluno: null,
		statusProfessor: null,
		turmaIds: [],
		turmaNomes: turmaRaw !== "" ? [turmaRaw] : [],
		especialidade: "",
		email: null,
		telefone: null,
		erro,
	};
}

function validarLinhas(linhasCsv: LinhaCsv[], turmasPorNome: Map<string, string>): LinhaValidada[] {
	return linhasCsv.map((linha, index) => {
		const numeroLinha = index + 2; // +1 pelo header, +1 porque a linha 1 já é a primeira de dados
		const nome = (linha.nome ?? "").trim();
		const tipoRaw = (linha.tipo ?? "").trim();
		const statusRaw = (linha.status ?? "").trim().toLowerCase();
		const turmaRaw = (linha.turma ?? "").trim();
		const especialidade = (linha.especialidade ?? "").trim();
		const email = (linha.email ?? "").trim();
		const telefone = (linha.telefone ?? "").trim();

		if (nome === "") {
			return linhaComErro(numeroLinha, nome, turmaRaw, "Nome vazio.");
		}

		const papeis = papeisDeTipoCsv(tipoRaw);
		if (papeis === null) {
			return linhaComErro(numeroLinha, nome, turmaRaw, `Tipo inválido: "${tipoRaw}" (use "aluno", "professor" ou "A&P").`);
		}

		const { statusAluno, statusProfessor, erro: erroStatus } = resolverStatusPorPapel(statusRaw, papeis);
		if (erroStatus !== null) {
			return linhaComErro(numeroLinha, nome, turmaRaw, erroStatus);
		}

		const turmaNomes = turmaRaw === "" ? [] : turmaRaw.split(",").map((item) => item.trim()).filter((item) => item !== "");
		const turmaIds: string[] = [];
		if (papeis.includes("aluno")) {
			for (const nomeTurma of turmaNomes) {
				const encontrada = turmasPorNome.get(nomeTurma.toLowerCase());
				if (encontrada === undefined) {
					return linhaComErro(
						numeroLinha,
						nome,
						turmaRaw,
						`Turma não encontrada: "${nomeTurma}". Cadastre a turma antes de importar.`,
					);
				}
				turmaIds.push(encontrada);
			}
		}

		return {
			linha: numeroLinha,
			nome,
			papeis,
			statusAluno,
			statusProfessor,
			turmaIds,
			turmaNomes,
			especialidade,
			email: email === "" ? null : email,
			telefone: telefone === "" ? null : telefone,
			erro: null,
		};
	});
}

function marcarDuplicatas(linhas: LinhaValidada[], nomesExistentes: Set<string>): Map<number, boolean> {
	const contagemNoCsv = new Map<string, number>();
	linhas.forEach((linha) => {
		if (linha.erro !== null) {
			return;
		}
		const chave = linha.nome.toLowerCase();
		contagemNoCsv.set(chave, (contagemNoCsv.get(chave) ?? 0) + 1);
	});

	const resultado = new Map<number, boolean>();
	linhas.forEach((linha) => {
		if (linha.erro !== null) {
			resultado.set(linha.linha, false);
			return;
		}
		const chave = linha.nome.toLowerCase();
		resultado.set(linha.linha, (contagemNoCsv.get(chave) ?? 0) > 1 || nomesExistentes.has(chave));
	});

	return resultado;
}

async function carregarTurmasEPessoas(): Promise<{
	turmasPorNome: Map<string, string>;
	mensalidadePorTurma: Map<string, number>;
	nomesExistentes: Set<string>;
}> {
	const firestore = getFirebaseAdminFirestore();
	const [turmasSnapshot, pessoasSnapshot] = await Promise.all([
		firestore.collection("turmas").where("ativo", "==", true).get(),
		firestore.collection("pessoas").where("ativo", "==", true).get(),
	]);

	const turmasPorNome = new Map<string, string>();
	const mensalidadePorTurma = new Map<string, number>();
	turmasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as { nome: string; mensalidadeCentavos: number };
		turmasPorNome.set(data.nome.trim().toLowerCase(), doc.id);
		mensalidadePorTurma.set(doc.id, data.mensalidadeCentavos);
	});

	const nomesExistentes = new Set(
		pessoasSnapshot.docs.map((doc) => (doc.data() as { nome: string }).nome.trim().toLowerCase()),
	);

	return { turmasPorNome, mensalidadePorTurma, nomesExistentes };
}

function rotuloPapeis(papeis: PapelCsv[]): string {
	return papeis.map((papel) => (papel === "aluno" ? "Aluno" : "Professor")).join(", ");
}

export async function previewImportacaoCsv(csvTexto: string): Promise<PreviewResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { status: "error", message: "Apenas administradores podem importar." };
	}

	let linhasCsv: LinhaCsv[];
	try {
		linhasCsv = parseCsv(csvTexto);
	} catch {
		return {
			status: "error",
			message: "CSV inválido. Colunas esperadas: nome, tipo, status, turma, especialidade, email, telefone.",
		};
	}

	const { turmasPorNome, nomesExistentes } = await carregarTurmasEPessoas();
	const validadas = validarLinhas(linhasCsv, turmasPorNome);
	const duplicatas = marcarDuplicatas(validadas, nomesExistentes);

	const linhas: LinhaPreview[] = validadas.map((linha) => ({
		linha: linha.linha,
		nome: linha.nome,
		tipo: rotuloPapeis(linha.papeis),
		turma: linha.turmaNomes.join(", "),
		status: [linha.statusAluno, linha.statusProfessor].filter((valor): valor is string => valor !== null).join(" / "),
		erro: linha.erro,
		duplicataProvavel: duplicatas.get(linha.linha) ?? false,
	}));

	return {
		status: "ok",
		linhas,
		totalValidas: linhas.filter((linha) => linha.erro === null).length,
	};
}

const LIMITE_POR_BATCH = 400;

export async function confirmarImportacaoCsv(csvTexto: string): Promise<ConfirmResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { status: "error", message: "Apenas administradores podem importar." };
	}

	let linhasCsv: LinhaCsv[];
	try {
		linhasCsv = parseCsv(csvTexto);
	} catch {
		return { status: "error", message: "CSV inválido." };
	}

	const firestore = getFirebaseAdminFirestore();
	const { turmasPorNome, mensalidadePorTurma } = await carregarTurmasEPessoas();
	const validas = validarLinhas(linhasCsv, turmasPorNome).filter((linha) => linha.erro === null);

	const agora = new Date();
	let batch = firestore.batch();
	let contadorNoBatch = 0;
	let importadas = 0;

	try {
		for (const linha of validas) {
			const pessoaRef = firestore.collection("pessoas").doc();
			const especialidades = linha.especialidade === "" ? [] : linha.especialidade.split(",").map((item) => item.trim()).filter((item) => item !== "");
			batch.set(pessoaRef, {
				nome: linha.nome,
				ehAluno: linha.papeis.includes("aluno"),
				ehProfessor: linha.papeis.includes("professor"),
				statusAluno: linha.statusAluno,
				statusProfessor: linha.statusProfessor,
				numeroMatriculaAluno: null,
				numeroMatriculaProfessor: null,
				interesses: especialidades,
				email: linha.email,
				telefone: linha.telefone,
				ativo: true,
				criadoViaContatoId: null,
				criadoEm: FieldValue.serverTimestamp(),
			});
			contadorNoBatch += 1;
			importadas += 1;

			// Mesma regra da criação manual (ver contatoInicialDeAluno): aluno importado
			// também precisa aparecer em Vagões, senão o funil fica cego pra quem entrou via CSV.
			if (linha.papeis.includes("aluno")) {
				const contatoRef = firestore.collection("contatos").doc();
				batch.set(
					contatoRef,
					contatoInicialDeAluno(
						{ id: pessoaRef.id, nome: linha.nome, statusAluno: linha.statusAluno ?? "lead", ativo: true },
						linha.turmaNomes[0] ?? null,
					),
				);
				contadorNoBatch += 1;
			}

			for (const turmaId of linha.turmaIds) {
				const matriculaRef = firestore.collection("matriculas").doc();
				batch.set(matriculaRef, {
					pessoaId: pessoaRef.id,
					turmaId,
					dataMatricula: agora,
					mensalidadeCombinadaCentavos: mensalidadePorTurma.get(turmaId) ?? 0,
					status: "ativa",
					ativo: true,
					observacoes: "Data de matrícula aproximada — importada via CSV, sem data original na origem.",
				});
				contadorNoBatch += 1;
			}

			if (contadorNoBatch >= LIMITE_POR_BATCH) {
				await batch.commit();
				batch = firestore.batch();
				contadorNoBatch = 0;
			}
		}

		if (contadorNoBatch > 0) {
			await batch.commit();
		}
	} catch {
		return { status: "error", message: "Falha ao gravar. Nenhuma linha adicional foi importada após o erro." };
	}

	revalidatePath("/pessoas");
	revalidatePath("/vagoes");
	return { status: "ok", importadas };
}
