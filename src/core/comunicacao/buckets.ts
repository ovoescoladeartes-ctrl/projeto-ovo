import type { ArquivadoMotivo, Contato, Estagio } from "./contatos/schema";

export interface Bucket {
	key: string;
	label: string;
	estagio: Estagio;
	arquivadoMotivo: ArquivadoMotivo | null;
}

/**
 * 6 baldes visuais do board (Figma node 34:2756) — os 5 estágios do PRD continuam a fonte
 * de verdade do dado; a exibição desktop separa "arquivado" em duas colunas por
 * `arquivadoMotivo`, lado a lado com as 4 colunas ativas.
 */
export const BUCKETS: readonly Bucket[] = [
	{ key: "novo", label: "Leads", estagio: "novo", arquivadoMotivo: null },
	{ key: "em_conversa", label: "Em conversa", estagio: "em_conversa", arquivadoMotivo: null },
	{ key: "experimental", label: "Experimental", estagio: "experimental", arquivadoMotivo: null },
	{ key: "convertido", label: "Matriculado", estagio: "convertido", arquivadoMotivo: null },
	{ key: "arquivado:ex_aluno", label: "Ex-aluno", estagio: "arquivado", arquivadoMotivo: "ex_aluno" },
	{ key: "arquivado:nao_convertido", label: "Não convertido", estagio: "arquivado", arquivadoMotivo: "nao_convertido" },
];

export function bucketKeyDe(contato: Pick<Contato, "estagio" | "arquivadoMotivo">): string {
	return contato.arquivadoMotivo ? `arquivado:${contato.arquivadoMotivo}` : contato.estagio;
}
