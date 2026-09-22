"use server";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { bucketKeyDe, BUCKETS } from "@/core/comunicacao/buckets";
import { lerContatosAtivos, type ContatoResumo } from "@/core/db/contatos";
import { lerPessoas } from "@/core/db/pessoas";
import { lerTurmas } from "@/core/db/turmas";
import { normalizar } from "@/core/pessoas/normalizar";
import type { Pessoa } from "@/core/pessoas/schema";
import type { Turma } from "@/core/turmas/schema";

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
const TAMANHO_MINIMO_TERMO = 2;

// Labels duplicados de propósito (não importa de `app/`, `core/` não depende de `app/`) — mesmo
// padrão já usado em `BUSCA_PESSOAS_ROLES` (core/pessoas/actions.ts).
const STATUS_ALUNO_LABEL: Record<string, string> = { lead: "Lead", matriculado: "Matriculado", ex_aluno: "Ex-aluno" };
const STATUS_PROFESSOR_LABEL: Record<string, string> = { banco_talentos: "Banco de talentos", ativo: "Ativo" };
const TURMA_TIPO_LABEL: Record<string, string> = { curso: "Curso", oficina: "Oficina" };

/** Filtra/ordena em memória — não faz I/O; `pessoas` já vem lido (e cacheado) por `lerPessoas()`. */
function buscarPessoasResultado(pessoas: readonly Pessoa[], termoNormalizado: string): ResultadoBusca[] {
	return pessoas
		.filter((pessoa) => pessoa.ativo && normalizar(pessoa.nome).includes(termoNormalizado))
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
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
				titulo: pessoa.nome,
				subtitulo: papeis.join(" · ") || "Pessoa",
				href: `/pessoas/${pessoa.id}`,
			};
		});
}

/** Filtra/ordena em memória — não faz I/O; `turmas` já vem lido (e cacheado) por `lerTurmas()`. */
function buscarTurmasResultado(turmas: readonly Turma[], termoNormalizado: string): ResultadoBusca[] {
	return turmas
		.filter(
			(turma) => turma.ativo && (normalizar(turma.nome).includes(termoNormalizado) || normalizar(turma.assunto).includes(termoNormalizado)),
		)
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
		.slice(0, LIMITE_POR_GRUPO)
		.map((turma) => {
			const assunto = turma.assunto || "—";
			return {
				tipo: "turma" as const,
				id: turma.id,
				titulo: turma.nome,
				subtitulo: turma.tipo !== null ? `${assunto} · ${TURMA_TIPO_LABEL[turma.tipo] ?? turma.tipo}` : assunto,
				// O filtro server-side de `pessoas/turmas/page.tsx` só compara contra `nome` — usar
				// `assunto` aqui (mesmo quando foi ele que bateu o match) chegaria sem filtro nenhum aplicado.
				href: `/pessoas/turmas?busca=${encodeURIComponent(turma.nome)}`,
			};
		});
}

/** Filtra/ordena em memória — não faz I/O; `contatos` já vem lido (e cacheado) por `lerContatosAtivos()`. */
function buscarContatosResultado(contatos: readonly ContatoResumo[], termoNormalizado: string): ResultadoBusca[] {
	return contatos
		.filter((contato) => normalizar(contato.nome).includes(termoNormalizado))
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
		.slice(0, LIMITE_POR_GRUPO)
		.map((contato) => ({
			tipo: "contato" as const,
			id: contato.id,
			titulo: contato.nome,
			subtitulo: BUCKETS.find((bucket) => bucket.key === bucketKeyDe(contato))?.label ?? contato.estagio,
			href: `/vagoes?contato=${contato.id}`,
		}));
}

/**
 * Busca global (Cmd+K): mesma estratégia de `buscarPessoas` (core/pessoas/actions.ts) — Firestore
 * não tem full-text nativo, busca tudo ativo por coleção e filtra substring normalizada em
 * memória (escala de escola pequena). Só consulta (via `src/core/db/`, cacheado por coleção) as
 * coleções que a role da sessão pode ver — não é um filtro pós-fetch, a promise nem roda pra quem
 * não tem acesso.
 */
export async function buscarGlobal(termo: string): Promise<ResultadoBusca[]> {
	const session = await getServerSession();
	if (session === null) {
		return [];
	}

	const termoNormalizado = normalizar(termo);
	if (termoNormalizado.length < TAMANHO_MINIMO_TERMO) {
		return [];
	}

	const podePessoasTurmas = PESSOAS_TURMAS_ROLES.includes(session.role);
	const podeContatos = CONTATOS_ROLES.includes(session.role);

	const [pessoas, turmas, contatos] = await Promise.all([
		podePessoasTurmas ? lerPessoas() : Promise.resolve([]),
		podePessoasTurmas ? lerTurmas() : Promise.resolve([]),
		podeContatos ? lerContatosAtivos() : Promise.resolve([]),
	]);

	return [
		...buscarPessoasResultado(pessoas, termoNormalizado),
		...buscarTurmasResultado(turmas, termoNormalizado),
		...buscarContatosResultado(contatos, termoNormalizado),
	];
}
