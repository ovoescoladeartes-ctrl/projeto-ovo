import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import type { Contato } from "@/core/comunicacao/contatos/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";

import { cacheDeColecao } from "./cacheDeColecao";
import { registrarLeitura } from "./leituras";

/**
 * `historico` fica de fora de propósito: é o único array não-limitado do domínio (cresce a cada
 * `registrarInteracaoContato`, sem teto) — trazê-lo pra toda entrada cacheada arriscaria se
 * aproximar do limite de 2MB por entrada do Data Cache em algum contato antigo/muito ativo.
 * `/vagoes`, o único consumidor que precisa de `historico`, continua lendo o doc direto.
 */
export type ContatoResumo = Omit<Contato, "historico">;

interface ContatoDoc {
	nome: string;
	canal: string;
	interesseInicial: string;
	estagio: string;
	arquivadoMotivo: string | null;
	pessoaId: string | null;
	estagioAtualizadoEm?: Timestamp;
	criadoEm?: Timestamp;
	ativo: boolean;
	interesses?: string[];
	linkReferencia?: string | null;
	observacoes?: string | null;
}

/**
 * Só ativos, ordenado por `estagioAtualizadoEm` — mantém o `where`+`orderBy` original pra
 * continuar usando o índice composto já declarado em `firestore.indexes.json`. Nenhum consumidor
 * atual precisa de contato inativo/arquivado além do que já vem por `estagio === "arquivado"`.
 */
export const lerContatosAtivos = cacheDeColecao("contatosAtivos", "contatos", async (): Promise<ContatoResumo[]> => {
	const snapshot = await getFirebaseAdminFirestore()
		.collection("contatos")
		.where("ativo", "==", true)
		.orderBy("estagioAtualizadoEm", "asc")
		.get();
	registrarLeitura("contatosAtivos", snapshot.size);
	return snapshot.docs.map((doc) => {
		const data = doc.data() as ContatoDoc;
		return {
			id: doc.id,
			nome: data.nome,
			canal: data.canal as ContatoResumo["canal"],
			interesseInicial: data.interesseInicial,
			estagio: data.estagio as ContatoResumo["estagio"],
			arquivadoMotivo: data.arquivadoMotivo as ContatoResumo["arquivadoMotivo"],
			pessoaId: data.pessoaId,
			estagioAtualizadoEm: toIso(data.estagioAtualizadoEm ?? null),
			criadoEm: toIso(data.criadoEm ?? null),
			ativo: data.ativo,
			interesses: data.interesses ?? [],
			linkReferencia: data.linkReferencia ?? null,
			observacoes: data.observacoes ?? null,
		};
	});
});
