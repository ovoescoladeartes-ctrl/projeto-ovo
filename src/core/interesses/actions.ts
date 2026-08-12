"use server";

import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";
import type { Interesse } from "./schema";

const INTERESSES_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

function podeGerenciarInteresses(role: Role): boolean {
	return INTERESSES_ROLES.includes(role);
}

function normalizar(valor: string): string {
	return valor.trim().toLowerCase();
}

interface InteresseDoc {
	nome: string;
	ativo: boolean;
	criadoEm?: Timestamp;
}

/** Vocabulário de tags: fonte de verdade é a coleção `interesses`, nunca derivada de Turma em tempo de leitura. */
export async function listarInteressesAtivos(): Promise<string[]> {
	const snapshot = await getFirebaseAdminFirestore().collection("interesses").where("ativo", "==", true).get();
	return snapshot.docs
		.map((doc) => (doc.data() as InteresseDoc).nome)
		.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export interface UpsertInteresseResult {
	status: "ok" | "error";
	message?: string;
	interesse?: Interesse;
}

/**
 * Cria um interesse se ainda não existir (case-insensitive/trim, ex.: "Cerâmica" e "cerâmica"
 * são o mesmo) ou retorna o já existente. Chamado tanto pelo botão "+ Cadastrar novo interesse"
 * (InteresseTagsInput, client) quanto por criarTurma/atualizarTurma quando o assunto da turma
 * ainda não existe — mesma checagem de permissão que já vale para criar Pessoa/Contato, sem
 * mecanismo de permissão novo.
 */
export async function upsertInteresse(nomeBruto: unknown): Promise<UpsertInteresseResult> {
	const session = await getServerSession();
	if (session === null || !podeGerenciarInteresses(session.role)) {
		return { status: "error", message: "Sem permissão para cadastrar interesses." };
	}

	const parsed = z.string().trim().min(1, "Nome é obrigatório.").safeParse(nomeBruto);
	if (!parsed.success) {
		return { status: "error", message: "Nome inválido." };
	}
	const nome = parsed.data;
	const chave = normalizar(nome);

	const firestore = getFirebaseAdminFirestore();
	try {
		const snapshot = await firestore.collection("interesses").get();
		const existente = snapshot.docs.find((doc) => normalizar((doc.data() as InteresseDoc).nome) === chave);
		if (existente) {
			const data = existente.data() as InteresseDoc;
			return {
				status: "ok",
				interesse: { id: existente.id, nome: data.nome, ativo: data.ativo, criadoEm: toIso(data.criadoEm ?? null) },
			};
		}

		const ref = await firestore.collection("interesses").add({
			nome,
			ativo: true,
			criadoEm: FieldValue.serverTimestamp(),
		});
		return { status: "ok", interesse: { id: ref.id, nome, ativo: true, criadoEm: null } };
	} catch {
		return { status: "error", message: "Não foi possível cadastrar o interesse. Tente novamente." };
	}
}
