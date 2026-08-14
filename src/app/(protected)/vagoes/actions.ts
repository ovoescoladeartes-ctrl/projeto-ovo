"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { ARQUIVADO_MOTIVOS, ESTAGIOS, novoContatoInputSchema } from "@/core/comunicacao/contatos/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const VAGOES_ROLES: readonly Role[] = ["admin", "comunicacao"];

function podeGerenciarVagoes(role: Role): boolean {
	return VAGOES_ROLES.includes(role);
}

export async function criarContato(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarVagoes(session.role)) {
		return { status: "error", message: "Sem permissão para criar contatos." };
	}

	const parsed = novoContatoInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	try {
		const firestore = getFirebaseAdminFirestore();
		const contatoRef = firestore.collection("contatos").doc();
		const pessoaRef = firestore.collection("pessoas").doc();
		const batch = firestore.batch();

		// Todo contato de Vagões já nasce com sua Pessoa (papel Aluno, status "lead") — mesma
		// garantia que `criarPessoa` dá no caminho inverso, pra "Pessoas" ser sempre a lista
		// completa de quem já passou por algum funil, não só quem convenceu até "convertido".
		batch.set(pessoaRef, {
			nome: parsed.data.nome,
			ehAluno: true,
			ehProfessor: false,
			statusAluno: "lead",
			statusProfessor: null,
			numeroMatriculaAluno: null,
			numeroMatriculaProfessor: null,
			interesses: parsed.data.interesses,
			email: null,
			telefone: null,
			ativo: true,
			criadoViaContatoId: contatoRef.id,
			criadoEm: FieldValue.serverTimestamp(),
			wixContactId: null,
			origem: "manual",
		});

		batch.set(contatoRef, {
			...parsed.data,
			estagio: "novo",
			arquivadoMotivo: null,
			pessoaId: pessoaRef.id,
			estagioAtualizadoEm: FieldValue.serverTimestamp(),
			criadoEm: FieldValue.serverTimestamp(),
			ativo: true,
		});

		await batch.commit();
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	revalidatePath("/vagoes");
	revalidatePath("/pessoas");
	return { status: "ok" };
}

const moverEstagioInputSchema = z.object({
	id: z.string().min(1),
	estagio: z.enum(ESTAGIOS),
	arquivadoMotivo: z.enum(ARQUIVADO_MOTIVOS).nullable(),
});

/**
 * Única costura real entre os módulos, e o único ponto do produto com requisito de
 * atomicidade forte — se o contato virar "convertido" sem a Pessoa ser criada (ou
 * vice-versa), a promessa central ("Camila não recadastra nada") quebra silenciosamente.
 * `moverEstagioContato` delega pra cá especificamente quando o destino é "convertido",
 * chamada tanto pelo drag quanto pela ação direta — mesma garantia nos dois caminhos.
 */
async function converterContatoEmPessoa(contatoId: string): Promise<ActionResult> {
	const firestore = getFirebaseAdminFirestore();
	const contatoRef = firestore.collection("contatos").doc(contatoId);
	const pessoaRef = firestore.collection("pessoas").doc();

	try {
		await firestore.runTransaction(async (tx) => {
			const contatoDoc = await tx.get(contatoRef);
			if (!contatoDoc.exists) {
				throw new Error("Contato não encontrado.");
			}

			const contatoData = contatoDoc.data() as { estagio: string; pessoaId: string | null; nome: string };

			// Idempotência: clique duplo no drag/botão não cria uma segunda Pessoa nem reescreve
			// um contato que já está convertido.
			if (contatoData.estagio === "convertido") {
				return;
			}

			// `pessoaId` já pode vir preenchido sem o contato estar "convertido" — todo aluno
			// nasce com um contato vinculado (ver contatoInicialDeAluno), então a Pessoa já
			// existe de antemão pra quem entrou via cadastro manual/CSV. Nesse caso só
			// sincroniza o estágio do contato, sem criar uma segunda Pessoa por engano.
			if (contatoData.pessoaId !== null) {
				tx.set(
					contatoRef,
					{
						estagio: "convertido",
						arquivadoMotivo: null,
						estagioAtualizadoEm: FieldValue.serverTimestamp(),
					},
					{ merge: true },
				);
				return;
			}

			tx.set(pessoaRef, {
				nome: contatoData.nome,
				ehAluno: true,
				ehProfessor: false,
				statusAluno: "matriculado",
				statusProfessor: null,
				numeroMatriculaAluno: null,
				numeroMatriculaProfessor: null,
				interesses: [],
				email: null,
				telefone: null,
				ativo: true,
				criadoViaContatoId: contatoId,
				criadoEm: FieldValue.serverTimestamp(),
				wixContactId: null,
				origem: "manual",
			});

			tx.set(
				contatoRef,
				{
					estagio: "convertido",
					arquivadoMotivo: null,
					pessoaId: pessoaRef.id,
					estagioAtualizadoEm: FieldValue.serverTimestamp(),
				},
				{ merge: true },
			);
		});
	} catch {
		return { status: "error", message: "Não foi possível converter. Tente novamente." };
	}

	revalidatePath("/vagoes");
	revalidatePath("/pessoas");
	return { status: "ok" };
}

export async function moverEstagioContato(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarVagoes(session.role)) {
		return { status: "error", message: "Sem permissão para mover contatos." };
	}

	const parsed = moverEstagioInputSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: "Dados inválidos." };
	}

	if (parsed.data.estagio === "convertido") {
		return converterContatoEmPessoa(parsed.data.id);
	}

	const firestore = getFirebaseAdminFirestore();
	const contatoRef = firestore.collection("contatos").doc(parsed.data.id);

	try {
		// `pessoaId` nunca é incluído aqui: mover um contato já convertido de volta para
		// outro estágio não apaga o vínculo — fica como rastro histórico (decisão fase 4).
		await contatoRef.set(
			{
				estagio: parsed.data.estagio,
				arquivadoMotivo: parsed.data.arquivadoMotivo,
				estagioAtualizadoEm: FieldValue.serverTimestamp(),
			},
			{ merge: true },
		);
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	// Fecha o laço com Cadastro: arquivar como "ex_aluno" aqui também reflete em
	// Pessoa.statusAluno — mas só quando isso não contradiz uma matrícula ativa de verdade (a
	// matrícula é a fonte de verdade sobre estar matriculado, o board é só o funil de comunicação).
	// Não cobre o caso raro de um contato nunca convertido (sem nenhuma Matrícula real) ser
	// arquivado direto como "ex_aluno" — viraria "ex_aluno" mesmo sem nunca ter sido aluno de
	// fato; não tratado aqui, ver design.md.
	if (parsed.data.estagio === "arquivado" && parsed.data.arquivadoMotivo === "ex_aluno") {
		const contatoDoc = await contatoRef.get();
		const contatoData = contatoDoc.data() as { pessoaId?: string | null } | undefined;
		if (contatoData?.pessoaId) {
			const pessoaId = contatoData.pessoaId;
			const pessoaRef = firestore.collection("pessoas").doc(pessoaId);
			await firestore.runTransaction(async (tx) => {
				const pessoaDoc = await tx.get(pessoaRef);
				if (!pessoaDoc.exists) {
					return;
				}
				const pessoaData = pessoaDoc.data() as { ehAluno: boolean; statusAluno: string | null };
				if (!pessoaData.ehAluno || pessoaData.statusAluno === "matriculado") {
					return;
				}
				tx.set(pessoaRef, { statusAluno: "ex_aluno" }, { merge: true });
			});
			revalidatePath(`/pessoas/${pessoaId}`);
		}
	}

	revalidatePath("/vagoes");
	revalidatePath("/pessoas");
	return { status: "ok" };
}
