"use server";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { normalizar } from "@/core/pessoas/normalizar";

export type PapelPessoa = "aluno" | "professor";

export interface PessoaBusca {
	id: string;
	nome: string;
	ehAluno: boolean;
	ehProfessor: boolean;
}

const BUSCA_PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

/**
 * Busca de Pessoa: traz todas as ativas (teto defensivo 1000, escala de escola pequena)
 * e filtra por substring normalizada em memória — Firestore não tem full-text nativo.
 */
export async function buscarPessoas(termo: string, papel?: PapelPessoa): Promise<PessoaBusca[]> {
	const session = await getServerSession();
	if (session === null || !BUSCA_PESSOAS_ROLES.includes(session.role)) {
		return [];
	}

	const snapshot = await getFirebaseAdminFirestore()
		.collection("pessoas")
		.where("ativo", "==", true)
		.limit(1000)
		.get();

	const termoNormalizado = normalizar(termo);

	const pessoas = snapshot.docs.map((doc) => {
		const data = doc.data() as { nome: string; ehAluno: boolean; ehProfessor: boolean };
		return { id: doc.id, nome: data.nome, ehAluno: data.ehAluno, ehProfessor: data.ehProfessor };
	});

	return pessoas
		.filter(
			(pessoa) =>
				(papel === undefined || (papel === "aluno" ? pessoa.ehAluno : pessoa.ehProfessor)) &&
				normalizar(pessoa.nome).includes(termoNormalizado),
		)
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
		.slice(0, 20);
}
