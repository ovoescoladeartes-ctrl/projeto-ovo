import { z } from "zod";

export const ESTAGIOS = ["novo", "em_conversa", "experimental", "convertido", "arquivado"] as const;
export type Estagio = (typeof ESTAGIOS)[number];

export const ARQUIVADO_MOTIVOS = ["ex_aluno", "nao_convertido"] as const;
export type ArquivadoMotivo = (typeof ARQUIVADO_MOTIVOS)[number];

export const CANAIS = ["whatsapp", "instagram", "indicacao", "site", "outro"] as const;
export type Canal = (typeof CANAIS)[number];

export const novoContatoInputSchema = z.object({
	nome: z.string().trim().min(1, "Nome é obrigatório."),
	canal: z.enum(CANAIS),
	interesseInicial: z.string().trim().min(1, "Conte o que a pessoa perguntou."),
	interesses: z.array(z.string()).default([]),
	pessoaId: z.string().nullable().default(null),
});

export type NovoContatoInput = z.infer<typeof novoContatoInputSchema>;

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
}
