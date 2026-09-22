"use server";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { lerPessoas } from "@/core/db/pessoas";
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
 * Busca de Pessoa: traz todas as ativas (via `lerPessoas()`, cacheado por coleção) e filtra por
 * substring normalizada em memória — Firestore não tem full-text nativo.
 */
export async function buscarPessoas(termo: string, papel?: PapelPessoa): Promise<PessoaBusca[]> {
	const session = await getServerSession();
	if (session === null || !BUSCA_PESSOAS_ROLES.includes(session.role)) {
		return [];
	}

	const pessoas = await lerPessoas();
	const termoNormalizado = normalizar(termo);

	return pessoas
		.filter(
			(pessoa) =>
				pessoa.ativo &&
				(papel === undefined || (papel === "aluno" ? pessoa.ehAluno : pessoa.ehProfessor)) &&
				normalizar(pessoa.nome).includes(termoNormalizado),
		)
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
		.slice(0, 20)
		.map((pessoa) => ({ id: pessoa.id, nome: pessoa.nome, ehAluno: pessoa.ehAluno, ehProfessor: pessoa.ehProfessor }));
}
