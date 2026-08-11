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
}

type PapelCsv = "aluno" | "professor";

interface LinhaValidada {
	linha: number;
	nome: string;
	papel: PapelCsv;
	status: string;
	turmaId: string | null;
	turmaNome: string | null;
	erro: string | null;
}

function parseCsv(texto: string): LinhaCsv[] {
	return parse<LinhaCsv>(texto, { columns: true, skip_empty_lines: true, trim: true });
}

/**
 * O CSV continua com uma coluna de valor único (uma pessoa, um papel por linha — sem suporte a
 * papel duplo na importação em lote; quem precisar do segundo papel completa depois editando a
 * pessoa). `"colaborador"` é o valor histórico da coluna; `"professor"` é aceito como sinônimo.
 */
function papelDeTipoCsv(tipoRaw: string): PapelCsv | null {
	if (tipoRaw === "aluno") {
		return "aluno";
	}
	if (tipoRaw === "colaborador" || tipoRaw === "professor") {
		return "professor";
	}
	return null;
}

function validarLinhas(linhasCsv: LinhaCsv[], turmasPorNome: Map<string, string>): LinhaValidada[] {
	return linhasCsv.map((linha, index) => {
		const numeroLinha = index + 2; // +1 pelo header, +1 porque a linha 1 já é a primeira de dados
		const nome = (linha.nome ?? "").trim();
		const tipoRaw = (linha.tipo ?? "").trim().toLowerCase();
		const statusRaw = (linha.status ?? "").trim().toLowerCase();
		const turmaRaw = (linha.turma ?? "").trim();

		if (nome === "") {
			return { linha: numeroLinha, nome, papel: "aluno" as const, status: statusRaw, turmaId: null, turmaNome: turmaRaw || null, erro: "Nome vazio." };
		}

		const papel = papelDeTipoCsv(tipoRaw);
		if (papel === null) {
			return {
				linha: numeroLinha,
				nome,
				papel: "aluno" as const,
				status: statusRaw,
				turmaId: null,
				turmaNome: turmaRaw || null,
				erro: `Tipo inválido: "${linha.tipo ?? ""}" (use "aluno" ou "colaborador").`,
			};
		}

		const statusValidos: readonly string[] = papel === "aluno" ? ALUNO_STATUS : PROFESSOR_STATUS;
		if (!statusValidos.includes(statusRaw)) {
			return {
				linha: numeroLinha,
				nome,
				papel,
				status: statusRaw,
				turmaId: null,
				turmaNome: turmaRaw || null,
				erro: `Status inválido para ${papel}: "${linha.status ?? ""}".`,
			};
		}

		let turmaId: string | null = null;
		if (papel === "aluno" && turmaRaw !== "") {
			const encontrada = turmasPorNome.get(turmaRaw.toLowerCase());
			if (encontrada === undefined) {
				return {
					linha: numeroLinha,
					nome,
					papel,
					status: statusRaw,
					turmaId: null,
					turmaNome: turmaRaw,
					erro: `Turma não encontrada: "${turmaRaw}". Cadastre a turma antes de importar.`,
				};
			}
			turmaId = encontrada;
		}

		return { linha: numeroLinha, nome, papel, status: statusRaw, turmaId, turmaNome: turmaRaw || null, erro: null };
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

export async function previewImportacaoCsv(csvTexto: string): Promise<PreviewResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { status: "error", message: "Apenas administradores podem importar." };
	}

	let linhasCsv: LinhaCsv[];
	try {
		linhasCsv = parseCsv(csvTexto);
	} catch {
		return { status: "error", message: "CSV inválido. Colunas esperadas: nome, tipo, turma, status." };
	}

	const { turmasPorNome, nomesExistentes } = await carregarTurmasEPessoas();
	const validadas = validarLinhas(linhasCsv, turmasPorNome);
	const duplicatas = marcarDuplicatas(validadas, nomesExistentes);

	const linhas: LinhaPreview[] = validadas.map((linha) => ({
		linha: linha.linha,
		nome: linha.nome,
		tipo: linha.papel,
		turma: linha.turmaNome ?? "",
		status: linha.status,
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
			batch.set(pessoaRef, {
				nome: linha.nome,
				ehAluno: linha.papel === "aluno",
				ehProfessor: linha.papel === "professor",
				statusAluno: linha.papel === "aluno" ? linha.status : null,
				statusProfessor: linha.papel === "professor" ? linha.status : null,
				numeroMatriculaAluno: null,
				numeroMatriculaProfessor: null,
				ativo: true,
				criadoViaContatoId: null,
				criadoEm: FieldValue.serverTimestamp(),
			});
			contadorNoBatch += 1;
			importadas += 1;

			// Mesma regra da criação manual (ver contatoInicialDeAluno): aluno importado
			// também precisa aparecer em Vagões, senão o funil fica cego pra quem entrou via CSV.
			if (linha.papel === "aluno") {
				const contatoRef = firestore.collection("contatos").doc();
				batch.set(
					contatoRef,
					contatoInicialDeAluno({ id: pessoaRef.id, nome: linha.nome, statusAluno: linha.status, ativo: true }, linha.turmaNome),
				);
				contadorNoBatch += 1;
			}

			if (linha.turmaId !== null) {
				const matriculaRef = firestore.collection("matriculas").doc();
				batch.set(matriculaRef, {
					pessoaId: pessoaRef.id,
					turmaId: linha.turmaId,
					dataMatricula: agora,
					mensalidadeCombinadaCentavos: mensalidadePorTurma.get(linha.turmaId) ?? 0,
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
