"use server";

import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { contatoInicialDeAluno } from "@/core/comunicacao/contatos/contatoDeAluno";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { matriculaInputSchema } from "@/core/matriculas/schema";
import { pessoaInputSchema } from "@/core/pessoas/schema";

import { matricular } from "./[id]/actions";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

/**
 * Opcional: só é enviado quando "Nova pessoa" já nasce com Turma marcada (papel Aluno). Reaproveita
 * o mesmo formato de `matriculaInputSchema`, sem `pessoaId` — que só existe depois do `batch.commit()`.
 */
const matriculaNaCriacaoSchema = matriculaInputSchema.omit({ pessoaId: true });

const PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

function podeGerenciarPessoas(role: Role): boolean {
	return PESSOAS_ROLES.includes(role);
}

/**
 * Checagem de role feita aqui dentro, no servidor — a sidebar só filtra a UI,
 * quem barra de verdade é a action (mesmo padrão de admin/usuarios/actions.ts).
 */
export async function criarPessoa(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarPessoas(session.role)) {
		return { status: "error", message: "Sem permissão para cadastrar pessoas." };
	}

	const parsed = pessoaInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	// Turma é opcional mesmo com papel Aluno — só valida se veio preenchida.
	const inputComoObjeto = input as { matricula?: unknown };
	let matriculaParsed: z.infer<typeof matriculaNaCriacaoSchema> | null = null;
	if (parsed.data.ehAluno && inputComoObjeto.matricula !== undefined && inputComoObjeto.matricula !== null) {
		const parsedMatricula = matriculaNaCriacaoSchema.safeParse(inputComoObjeto.matricula);
		if (!parsedMatricula.success) {
			return { status: "error", message: parsedMatricula.error.issues[0]?.message ?? "Dados da matrícula inválidos." };
		}
		matriculaParsed = parsedMatricula.data;
	}

	let pessoaId: string;
	try {
		const firestore = getFirebaseAdminFirestore();
		const pessoaRef = firestore.collection("pessoas").doc();
		pessoaId = pessoaRef.id;
		const batch = firestore.batch();

		// Marcar um papel só abre a possibilidade — deixa a pessoa em "lead"/"banco_talentos",
		// sem número nenhum. O número nasce num evento concreto depois (matricular / se tornar
		// educador de turma ativa), nunca aqui.
		batch.set(pessoaRef, {
			nome: parsed.data.nome,
			ehAluno: parsed.data.ehAluno,
			ehProfessor: parsed.data.ehProfessor,
			statusAluno: parsed.data.ehAluno ? "lead" : null,
			statusProfessor: parsed.data.ehProfessor ? "banco_talentos" : null,
			numeroMatriculaAluno: null,
			numeroMatriculaProfessor: null,
			interesses: parsed.data.interesses,
			email: parsed.data.email ?? null,
			telefone: parsed.data.telefone ?? null,
			ativo: true,
			criadoViaContatoId: null,
			criadoEm: FieldValue.serverTimestamp(),
			wixContactId: null,
			origem: "manual",
		});

		// Aluno entra no funil de Vagões desde já; professor ainda não tem funil (ver
		// contatoInicialDeAluno) — quando o funil financeiro existir, entra aqui como um
		// caminho separado, sem mexer neste.
		if (parsed.data.ehAluno) {
			const contatoRef = firestore.collection("contatos").doc();
			batch.set(
				contatoRef,
				contatoInicialDeAluno({ id: pessoaRef.id, nome: parsed.data.nome, statusAluno: "lead", ativo: true }),
			);
		}

		await batch.commit();
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	// Turma escolhida já na criação: reaproveita a mesma action de matrícula usada na tela de
	// detalhe (número de matrícula + sincronização do Contato pra "convertido"), sem duplicar lógica.
	if (matriculaParsed !== null) {
		const resultadoMatricula = await matricular({ ...matriculaParsed, pessoaId });
		if (resultadoMatricula.status === "error") {
			return resultadoMatricula;
		}
	}

	revalidatePath("/pessoas");
	revalidatePath("/vagoes");
	return { status: "ok" };
}

const idSchema = z.string().min(1);

interface MatriculaAtivaDoc {
	turmaId: string;
}

interface TurmaAtivaDoc {
	nome: string;
}

/**
 * Arquivar fica bloqueado enquanto houver engajamento ativo em qualquer papel: matrícula ativa
 * (aluno) ou ser educador de turma ativa (professor). Sem checagem condicionada a
 * `ehAluno`/`ehProfessor` — uma query vazia simplesmente não bloqueia nada.
 */
async function motivoBloqueioArquivarPessoa(pessoaId: string): Promise<string | null> {
	const firestore = getFirebaseAdminFirestore();

	const [matriculasAtivas, turmasComoEducador] = await Promise.all([
		firestore.collection("matriculas").where("pessoaId", "==", pessoaId).where("status", "==", "ativa").get(),
		firestore.collection("turmas").where("educadorPessoaId", "==", pessoaId).where("ativo", "==", true).get(),
	]);

	const motivos: string[] = [];

	if (!matriculasAtivas.empty) {
		const turmaIds = matriculasAtivas.docs.map((doc) => (doc.data() as MatriculaAtivaDoc).turmaId);
		const turmaDocs = await Promise.all(turmaIds.map((turmaId) => firestore.collection("turmas").doc(turmaId).get()));
		const nomesTurmas = turmaDocs.map((doc) => (doc.data() as { nome?: string } | undefined)?.nome ?? "(turma removida)");
		motivos.push(`Essa pessoa tem matrícula ativa em ${nomesTurmas.join(", ")}. Encerre a matrícula antes de arquivar.`);
	}

	if (!turmasComoEducador.empty) {
		const nomesTurmas = turmasComoEducador.docs.map((doc) => (doc.data() as TurmaAtivaDoc).nome);
		motivos.push(`Essa pessoa é educadora de ${nomesTurmas.join(", ")}. Troque o educador antes de arquivar.`);
	}

	return motivos.length > 0 ? motivos.join(" ") : null;
}

export async function inativarPessoa(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarPessoas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar pessoas." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const motivo = await motivoBloqueioArquivarPessoa(parsed.data);
	if (motivo !== null) {
		return { status: "error", message: motivo };
	}

	try {
		await getFirebaseAdminFirestore().collection("pessoas").doc(parsed.data).set(
			{ ativo: false },
			{ merge: true },
		);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data}`);
	return { status: "ok" };
}

/** Reversível na hora — sem checagem de bloqueio, diferente de arquivar (que tem efeito colateral em Vagões/Turmas). */
export async function reativarPessoa(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarPessoas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar pessoas." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	try {
		await getFirebaseAdminFirestore().collection("pessoas").doc(parsed.data).set({ ativo: true }, { merge: true });
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data}`);
	return { status: "ok" };
}

const campoOpcional = z
	.string()
	.trim()
	.transform((valor) => (valor === "" ? null : valor))
	.nullable()
	.optional();

const campoEmailOpcional = z.preprocess(
	(valor) => (typeof valor === "string" && valor.trim() === "" ? null : valor),
	z.string().trim().email("Email inválido.").nullable().optional(),
);

const pessoaUpdateInputSchema = z
	.object({
		id: z.string().min(1),
		nome: z.string().trim().min(1, "Nome é obrigatório."),
		ehAluno: z.boolean(),
		ehProfessor: z.boolean(),
		interesses: z.array(z.string()).optional(),
		email: campoEmailOpcional,
		telefone: campoOpcional,
	})
	.refine((dados) => dados.ehAluno || dados.ehProfessor, {
		message: "Marque pelo menos um papel (Aluno ou Professor).",
		path: ["ehAluno"],
	});

interface PessoaAtualDoc {
	nome: string;
	ehAluno: boolean;
	ehProfessor: boolean;
	statusAluno: string | null;
	statusProfessor: string | null;
	ativo: boolean;
}

export async function atualizarPessoa(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarPessoas(session.role)) {
		return { status: "error", message: "Sem permissão para alterar pessoas." };
	}

	const parsed = pessoaUpdateInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const firestore = getFirebaseAdminFirestore();
	const ref = firestore.collection("pessoas").doc(parsed.data.id);

	try {
		const doc = await ref.get();
		if (!doc.exists) {
			return { status: "error", message: "Pessoa não encontrada." };
		}

		const atual = doc.data() as PessoaAtualDoc;
		const ganhouAluno = parsed.data.ehAluno && !atual.ehAluno;
		const ganhouProfessor = parsed.data.ehProfessor && !atual.ehProfessor;

		const updatePayload: Record<string, unknown> = {
			nome: parsed.data.nome,
			ehAluno: parsed.data.ehAluno,
			ehProfessor: parsed.data.ehProfessor,
		};
		if (parsed.data.interesses !== undefined) {
			updatePayload.interesses = parsed.data.interesses;
		}
		if (parsed.data.email !== undefined) {
			updatePayload.email = parsed.data.email;
		}
		if (parsed.data.telefone !== undefined) {
			updatePayload.telefone = parsed.data.telefone;
		}
		if (ganhouAluno && atual.statusAluno === null) {
			updatePayload.statusAluno = "lead";
		}
		if (ganhouProfessor && atual.statusProfessor === null) {
			updatePayload.statusProfessor = "banco_talentos";
		}

		await ref.set(updatePayload, { merge: true });

		// Ganhar o papel Aluno depois da criação também precisa criar o Contato em Vagões — mas
		// só se a pessoa ainda não tiver um (evita duplicar se o papel for removido e adicionado
		// de novo depois).
		if (ganhouAluno) {
			const contatoExistente = await firestore.collection("contatos").where("pessoaId", "==", parsed.data.id).limit(1).get();
			if (contatoExistente.empty) {
				await firestore.collection("contatos").add(
					contatoInicialDeAluno({
						id: parsed.data.id,
						nome: parsed.data.nome,
						statusAluno: atual.statusAluno ?? "lead",
						ativo: atual.ativo,
					}),
				);
			}
		}
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/pessoas");
	revalidatePath(`/pessoas/${parsed.data.id}`);
	revalidatePath("/vagoes");
	return { status: "ok" };
}

/**
 * Qualquer vínculo (Matrícula ou Recebimento, de qualquer status/histórico) bloqueia a exclusão
 * permanente — só o soft-delete (arquivar) fica disponível enquanto isso existir. Diferente do
 * bloqueio de arquivar (item 4), aqui não se checa educador de Turma — decisão do próprio pedido.
 */
async function motivoBloqueioExclusaoPessoa(pessoaId: string): Promise<string | null> {
	const firestore = getFirebaseAdminFirestore();
	const [matriculas, recebimentos] = await Promise.all([
		firestore.collection("matriculas").where("pessoaId", "==", pessoaId).limit(1).get(),
		firestore.collection("recebimentos").where("pessoaId", "==", pessoaId).limit(1).get(),
	]);

	if (!matriculas.empty || !recebimentos.empty) {
		return "Existem matrículas ou recebimentos ligados a essa pessoa. Resolva essas pendências (ou aceite que elas continuam como histórico arquivado) antes de excluir de vez.";
	}
	return null;
}

export interface VerificarBloqueioResult {
	bloqueado: boolean;
	motivo: string | null;
}

export async function verificarBloqueioExclusaoPessoa(id: unknown): Promise<VerificarBloqueioResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { bloqueado: true, motivo: "Sem permissão." };
	}
	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { bloqueado: true, motivo: "Dados inválidos." };
	}
	const motivo = await motivoBloqueioExclusaoPessoa(parsed.data);
	return { bloqueado: motivo !== null, motivo };
}

export async function excluirPessoaPermanentemente(id: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || session.role !== "admin") {
		return { status: "error", message: "Apenas administradores podem excluir permanentemente." };
	}

	const parsed = idSchema.safeParse(id);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	const ref = getFirebaseAdminFirestore().collection("pessoas").doc(parsed.data);

	try {
		const doc = await ref.get();
		if (!doc.exists) {
			return { status: "error", message: "Pessoa não encontrada." };
		}
		if ((doc.data() as { ativo: boolean }).ativo) {
			return { status: "error", message: "Só é possível excluir permanentemente um registro já arquivado." };
		}

		const motivo = await motivoBloqueioExclusaoPessoa(parsed.data);
		if (motivo !== null) {
			return { status: "error", message: motivo };
		}

		await ref.delete();
	} catch {
		return { status: "error", message: "Não foi possível excluir. Tente novamente." };
	}

	revalidatePath("/pessoas");
	return { status: "ok" };
}

const EXPORT_STATUS_LABELS: Record<string, string> = {
	lead: "Lead",
	matriculado: "Matriculado",
	ativo: "Ativo",
	banco_talentos: "Banco de talentos",
};

const buscarContatosParaExportarInputSchema = z.array(z.string().min(1)).min(1, "Selecione ao menos uma pessoa.");

export interface ContatoParaExportar {
	id: string;
	nome: string;
	email: string | null;
	telefone: string | null;
	tipo: string;
	status: string;
	turmas: string;
	criadoEm: string;
}

/**
 * Uma busca só, usada pelas 5 ações do dropdown "Exportar" (planilha, copiar email/telefone,
 * WhatsApp, vCard) — cada ação formata este mesmo retorno do jeito que precisa, no client.
 */
export async function buscarContatosParaExportar(input: unknown): Promise<ContatoParaExportar[]> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarPessoas(session.role)) {
		return [];
	}

	const parsed = buscarContatosParaExportarInputSchema.safeParse(input);
	if (!parsed.success) {
		return [];
	}

	const firestore = getFirebaseAdminFirestore();

	const [pessoaDocs, turmasSnapshot, matriculasSnapshot] = await Promise.all([
		Promise.all(parsed.data.map((id) => firestore.collection("pessoas").doc(id).get())),
		firestore.collection("turmas").get(),
		firestore.collection("matriculas").where("status", "==", "ativa").get(),
	]);

	const turmasNomes = new Map<string, string>();
	turmasSnapshot.docs.forEach((doc) => {
		turmasNomes.set(doc.id, (doc.data() as { nome: string }).nome);
	});
	const turmasPorPessoa = new Map<string, string[]>();
	matriculasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as { pessoaId: string; turmaId: string };
		const nome = turmasNomes.get(data.turmaId);
		if (nome === undefined) {
			return;
		}
		const lista = turmasPorPessoa.get(data.pessoaId) ?? [];
		lista.push(nome);
		turmasPorPessoa.set(data.pessoaId, lista);
	});

	return pessoaDocs
		.filter((doc) => doc.exists)
		.map((doc) => {
			const data = doc.data() as {
				nome: string;
				ehAluno: boolean;
				ehProfessor: boolean;
				statusAluno: string | null;
				statusProfessor: string | null;
				email?: string | null;
				telefone?: string | null;
				criadoEm?: Timestamp;
			};
			const tipo = [data.ehAluno ? "Aluno" : null, data.ehProfessor ? "Professor" : null].filter(Boolean).join(", ");
			const status = [
				data.ehAluno && data.statusAluno !== null ? EXPORT_STATUS_LABELS[data.statusAluno] : null,
				data.ehProfessor && data.statusProfessor !== null ? EXPORT_STATUS_LABELS[data.statusProfessor] : null,
			]
				.filter((valor): valor is string => valor !== null)
				.join(" / ");
			return {
				id: doc.id,
				nome: data.nome,
				email: data.email ?? null,
				telefone: data.telefone ?? null,
				tipo,
				status,
				turmas: (turmasPorPessoa.get(doc.id) ?? []).join(", "),
				criadoEm: data.criadoEm ? data.criadoEm.toDate().toLocaleDateString("pt-BR") : "",
			};
		});
}
