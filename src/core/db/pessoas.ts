import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import type { Pessoa } from "@/core/pessoas/schema";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

interface PessoaDoc {
	nome: string;
	ehAluno: boolean;
	ehProfessor: boolean;
	statusAluno: string | null;
	statusProfessor: string | null;
	ativo: boolean;
	criadoViaContatoId: string | null;
	criadoEm?: Timestamp;
	interesses?: string[];
	numeroMatriculaAluno?: string | null;
	numeroMatriculaProfessor?: string | null;
	email?: string | null;
	telefone?: string | null;
	wixContactId?: string | null;
	origem?: Pessoa["origem"];
}

/**
 * Coleção inteira, sem `where("ativo", ...)` — de propósito. Consumidores precisam de recortes
 * diferentes (busca quer só ativos; pendências e `/caixa` precisam do nome de pessoa mesmo
 * inativa, para recebimento histórico) — cada um filtra em memória. Uma entrada de cache única
 * que serve todo mundo é mais barata que N entradas por filtro, na escala desta base (~55-80
 * docs).
 */
export const lerPessoas = cacheDeColecao("pessoas", "pessoas", async (): Promise<Pessoa[]> => {
	const snapshot = await getFirebaseAdminFirestore().collection("pessoas").get();
	registrarLeitura("pessoas", snapshot.size);
	return snapshot.docs.map((doc) => {
		const data = doc.data() as PessoaDoc;
		return {
			id: doc.id,
			nome: data.nome,
			ehAluno: data.ehAluno,
			ehProfessor: data.ehProfessor,
			statusAluno: data.statusAluno as Pessoa["statusAluno"],
			statusProfessor: data.statusProfessor as Pessoa["statusProfessor"],
			ativo: data.ativo,
			criadoViaContatoId: data.criadoViaContatoId ?? null,
			criadoEm: toIso(data.criadoEm ?? null),
			interesses: data.interesses ?? [],
			numeroMatriculaAluno: data.numeroMatriculaAluno ?? null,
			numeroMatriculaProfessor: data.numeroMatriculaProfessor ?? null,
			email: data.email ?? null,
			telefone: data.telefone ?? null,
			wixContactId: data.wixContactId ?? null,
			origem: data.origem ?? "manual",
		};
	});
});
