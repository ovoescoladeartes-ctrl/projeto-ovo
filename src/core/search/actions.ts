"use server";

import type { Firestore } from "firebase-admin/firestore";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { bucketKeyDe, BUCKETS } from "@/core/comunicacao/buckets";
import type { ArquivadoMotivo, Estagio } from "@/core/comunicacao/contatos/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { normalizar } from "@/core/pessoas/normalizar";

export type ResultadoBuscaTipo = "pessoa" | "turma" | "contato";

export interface ResultadoBusca {
	tipo: ResultadoBuscaTipo;
	id: string;
	titulo: string;
	subtitulo: string;
	href: string;
}

const PESSOAS_TURMAS_ROLES: readonly Role[] = ["admin", "comunicacao", "financeiro"];
const CONTATOS_ROLES: readonly Role[] = ["admin", "comunicacao"];
const LIMITE_POR_GRUPO = 5;

// Labels duplicados de propósito (não importa de `app/`, `core/` não depende de `app/`) — mesmo
// padrão já usado em `BUSCA_PESSOAS_ROLES` (core/pessoas/actions.ts).
const STATUS_ALUNO_LABEL: Record<string, string> = { lead: "Lead", matriculado: "Matriculado", ex_aluno: "Ex-aluno" };
const STATUS_PROFESSOR_LABEL: Record<string, string> = { banco_talentos: "Banco de talentos", ativo: "Ativo" };
const TURMA_TIPO_LABEL: Record<string, string> = { curso: "Curso", oficina: "Oficina" };

interface PessoaDoc {
	nome: string;
	ehAluno: boolean;
	ehProfessor: boolean;
	statusAluno: string | null;
	statusProfessor: string | null;
}

interface TurmaDoc {
	nome: string;
	assunto: string;
	tipo: string | null;
}

interface ContatoDoc {
	nome: string;
	estagio: Estagio;
	arquivadoMotivo: ArquivadoMotivo | null;
}

async function buscarPessoasResultado(db: Firestore, termoNormalizado: string): Promise<ResultadoBusca[]> {
	const snapshot = await db.collection("pessoas").where("ativo", "==", true).limit(1000).get();

	return snapshot.docs
		.map((doc) => ({ id: doc.id, ...(doc.data() as PessoaDoc) }))
		.filter((pessoa) => normalizar(pessoa.nome ?? "").includes(termoNormalizado))
		.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"))
		.slice(0, LIMITE_POR_GRUPO)
		.map((pessoa) => {
			const papeis: string[] = [];
			if (pessoa.ehAluno) {
				papeis.push(`Aluno · ${STATUS_ALUNO_LABEL[pessoa.statusAluno ?? ""] ?? "—"}`);
			}
			if (pessoa.ehProfessor) {
				papeis.push(`Professor · ${STATUS_PROFESSOR_LABEL[pessoa.statusProfessor ?? ""] ?? "—"}`);
			}
			return {
				tipo: "pessoa" as const,
				id: pessoa.id,
				titulo: pessoa.nome ?? "(sem nome)",
				subtitulo: papeis.join(" · ") || "Pessoa",
				href: `/pessoas/${pessoa.id}`,
			};
		});
}

async function buscarTurmasResultado(db: Firestore, termoNormalizado: string): Promise<ResultadoBusca[]> {
	const snapshot = await db.collection("turmas").where("ativo", "==", true).limit(1000).get();

	return snapshot.docs
		.map((doc) => ({ id: doc.id, ...(doc.data() as TurmaDoc) }))
		.filter(
			(turma) => normalizar(turma.nome ?? "").includes(termoNormalizado) || normalizar(turma.assunto ?? "").includes(termoNormalizado),
		)
		.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"))
		.slice(0, LIMITE_POR_GRUPO)
		.map((turma) => {
			const assunto = turma.assunto ?? "—";
			return {
				tipo: "turma" as const,
				id: turma.id,
				titulo: turma.nome ?? "(sem nome)",
				subtitulo: turma.tipo !== null ? `${assunto} · ${TURMA_TIPO_LABEL[turma.tipo] ?? turma.tipo}` : assunto,
				// O filtro server-side de `pessoas/turmas/page.tsx` só compara contra `nome` — usar
				// `assunto` aqui (mesmo quando foi ele que bateu o match) chegaria sem filtro nenhum aplicado.
				href: `/pessoas/turmas?busca=${encodeURIComponent(turma.nome ?? "")}`,
			};
		});
}

async function buscarContatosResultado(db: Firestore, termoNormalizado: string): Promise<ResultadoBusca[]> {
	const snapshot = await db.collection("contatos").where("ativo", "==", true).limit(1000).get();

	return snapshot.docs
		.map((doc) => ({ id: doc.id, ...(doc.data() as ContatoDoc) }))
		.filter((contato) => normalizar(contato.nome ?? "").includes(termoNormalizado))
		.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"))
		.slice(0, LIMITE_POR_GRUPO)
		.map((contato) => ({
			tipo: "contato" as const,
			id: contato.id,
			titulo: contato.nome ?? "(sem nome)",
			subtitulo: BUCKETS.find((bucket) => bucket.key === bucketKeyDe(contato))?.label ?? contato.estagio,
			href: `/vagoes?contato=${contato.id}`,
		}));
}

/**
 * Busca global (Cmd+K): mesma estratégia de `buscarPessoas` (core/pessoas/actions.ts) — Firestore
 * não tem full-text nativo, busca tudo ativo por coleção e filtra substring normalizada em
 * memória (escala de escola pequena). Só consulta as coleções que a role da sessão pode ver — não
 * é um filtro pós-fetch, a promise nem roda pra quem não tem acesso.
 */
export async function buscarGlobal(termo: string): Promise<ResultadoBusca[]> {
	const session = await getServerSession();
	if (session === null) {
		return [];
	}

	const termoNormalizado = normalizar(termo);
	if (termoNormalizado.length < 2) {
		return [];
	}

	const db = getFirebaseAdminFirestore();
	const podePessoasTurmas = PESSOAS_TURMAS_ROLES.includes(session.role);
	const podeContatos = CONTATOS_ROLES.includes(session.role);

	const [pessoas, turmas, contatos] = await Promise.all([
		podePessoasTurmas ? buscarPessoasResultado(db, termoNormalizado) : Promise.resolve([]),
		podePessoasTurmas ? buscarTurmasResultado(db, termoNormalizado) : Promise.resolve([]),
		podeContatos ? buscarContatosResultado(db, termoNormalizado) : Promise.resolve([]),
	]);

	return [...pessoas, ...turmas, ...contatos];
}
