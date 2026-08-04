"use server";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { PessoaTipo } from "@/core/pessoas/schema";

export interface PessoaBusca {
	id: string;
	nome: string;
	tipo: PessoaTipo;
	status: string;
}

const BUSCA_PESSOAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];

function normalizar(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

/**
 * Busca de Pessoa: traz todas as ativas (teto defensivo 1000, escala de escola pequena)
 * e filtra por substring normalizada em memória — Firestore não tem full-text nativo.
 */
export async function buscarPessoas(termo: string, tipo?: PessoaTipo): Promise<PessoaBusca[]> {
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
		const data = doc.data() as { nome: string; tipo: string; status: string };
		return { id: doc.id, nome: data.nome, tipo: data.tipo as PessoaTipo, status: data.status };
	});

	return pessoas
		.filter((pessoa) => (tipo === undefined || pessoa.tipo === tipo) && normalizar(pessoa.nome).includes(termoNormalizado))
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
		.slice(0, 20);
}
