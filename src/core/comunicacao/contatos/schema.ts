import { z } from "zod";

export const ESTAGIOS = ["novo", "em_conversa", "experimental", "convertido", "arquivado"] as const;
export type Estagio = (typeof ESTAGIOS)[number];

export const ARQUIVADO_MOTIVOS = ["ex_aluno", "nao_convertido"] as const;
export type ArquivadoMotivo = (typeof ARQUIVADO_MOTIVOS)[number];

export const CANAIS = ["whatsapp", "instagram", "indicacao", "site", "outro"] as const;
export type Canal = (typeof CANAIS)[number];

/** Detecta um par de tag HTML (`<algo>`/`</algo>`) — pega o caso real já visto em produção (alguém colou o HTML de uma linha da tabela de Pessoas, em vez do nome em texto puro), sem reagir a um `<`/`>` solto que porventura apareça num nome legítimo. */
const PARECE_MARCACAO_HTML = /<\/?[a-z][^<>]*>/i;

const nomeContatoSchema = z
	.string()
	.trim()
	.min(1, "Nome é obrigatório.")
	.refine((valor) => !PARECE_MARCACAO_HTML.test(valor), "Nome não pode conter marcação HTML — cole só o texto, não o código da página.");

export const novoContatoInputSchema = z.object({
	nome: nomeContatoSchema,
	canal: z.enum(CANAIS),
	interesseInicial: z.string().trim().min(1, "Conte o que a pessoa perguntou."),
	interesses: z.array(z.string()).default([]),
	pessoaId: z.string().nullable().default(null),
});

export type NovoContatoInput = z.infer<typeof novoContatoInputSchema>;

export interface InteracaoContato {
	texto: string;
	criadoEm: string;
	autorNome: string;
}

export interface Contato {
	id: string;
	nome: string;
	canal: Canal;
	interesseInicial: string;
	estagio: Estagio;
	arquivadoMotivo: ArquivadoMotivo | null;
	pessoaId: string | null;
	/** Campo crítico: urgência conta a partir daqui, nunca da última mensagem (decisão fechada). */
	estagioAtualizadoEm: string | null;
	criadoEm: string | null;
	ativo: boolean;
	/** Assuntos de interesse estruturados (nascem dos `assunto` de Turma) — `interesseInicial` continua como texto livre. */
	interesses: string[];
	/** Link solto (ex.: post/perfil de origem) — texto simples, sem validação de URL. */
	linkReferencia: string | null;
	/** Observação livre, separada de `interesseInicial` (que é "o que a pessoa perguntou"). */
	observacoes: string | null;
	/** Lista simples de interações, mais recente por último — não é um chat completo. */
	historico: InteracaoContato[];
}

export const editarContatoInputSchema = z.object({
	id: z.string().min(1),
	nome: nomeContatoSchema,
	canal: z.enum(CANAIS),
	interesseInicial: z.string().trim().min(1, "Conte o que a pessoa perguntou."),
	interesses: z.array(z.string()).default([]),
	linkReferencia: z.string().trim().nullable().default(null),
	observacoes: z.string().trim().nullable().default(null),
});

export type EditarContatoInput = z.infer<typeof editarContatoInputSchema>;

export const registrarInteracaoInputSchema = z.object({
	id: z.string().min(1),
	texto: z.string().trim().min(1, "Escreva alguma coisa."),
});

export type RegistrarInteracaoInput = z.infer<typeof registrarInteracaoInputSchema>;
