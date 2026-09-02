import { z } from "zod";

/**
 * Checklist do Dia (Figma: frames "1 · Checklist do Dia" a "5 · Modal de Material", node
 * 250:2633-250:3453) — três momentos fixos de revisão ("os três horários da Katlin",
 * mini-prd.md), sem campo permanente de horário no Contato: os itens são derivados ao vivo da
 * lógica de pendência já existente (`core/comunicacao/pendencias.ts`), não atribuídos
 * permanentemente a um bloco.
 */
export const TIME_BLOCK_IDS = ["manha", "almoco", "final_do_dia"] as const;
export type TimeBlockId = (typeof TIME_BLOCK_IDS)[number];

export interface TimeBlockDefinicao {
	id: TimeBlockId;
	label: string;
	/** Hora local (0-23) a partir da qual o bloco vira um "momento de revisão" já ocorrido — antes disso o bloco não é exibido, pra não mostrar pendência de um horário que ainda não chegou. */
	horaInicio: number;
}

export const TIME_BLOCK_DEFINICOES: readonly TimeBlockDefinicao[] = [
	{ id: "manha", label: "Manhã (8h)", horaInicio: 8 },
	{ id: "almoco", label: "Almoço (12h)", horaInicio: 12 },
	{ id: "final_do_dia", label: "Final do dia (18h)", horaInicio: 18 },
];

/** `dia` sempre tem o formato fixo "yyyy-MM-dd" (regex já garantiu isso antes de chamar). */
function parseDia(dia: string): { ano: number; mes: number; diaDoMes: number } {
	return { ano: Number(dia.slice(0, 4)), mes: Number(dia.slice(5, 7)), diaDoMes: Number(dia.slice(8, 10)) };
}

export const diaSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Dia inválido.")
	.refine((valor) => {
		const { ano, mes, diaDoMes } = parseDia(valor);
		const data = new Date(ano, mes - 1, diaDoMes);
		// `Date` rola datas inexistentes (ex.: 2025-02-30 vira 2025-03-02) — comparar os componentes
		// de volta detecta isso (mesma técnica de `semanaSchema` do Ritual financeiro).
		return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === diaDoMes;
	}, "Dia inválido.");

export const CHECKLIST_ITEM_TIPOS = ["contato", "manual"] as const;
export type ChecklistItemTipo = (typeof CHECKLIST_ITEM_TIPOS)[number];

export const alternarItemChecklistSchema = z.object({
	dia: diaSchema,
	tipo: z.enum(CHECKLIST_ITEM_TIPOS),
	itemId: z.string().min(1),
	concluido: z.boolean(),
});

export type AlternarItemChecklistInput = z.infer<typeof alternarItemChecklistSchema>;

export const criarItemManualSchema = z.object({
	dia: diaSchema,
	titulo: z.string().trim().min(1, "Nome do item é obrigatório."),
});

export type CriarItemManualInput = z.infer<typeof criarItemManualSchema>;

export interface ChecklistContatoItem {
	contatoId: string;
	nome: string;
	canal: string;
	diasAguardando: number;
	concluido: boolean;
	concluidoEm: string | null;
	concluidoPor: string | null;
}

export interface ChecklistManualItem {
	id: string;
	titulo: string;
	concluido: boolean;
	concluidoEm: string | null;
	concluidoPor: string | null;
}

export interface ChecklistBloco {
	id: TimeBlockId;
	label: string;
	horaInicio: number;
	/** `false` quando `agora` ainda não chegou em `horaInicio` — bloco existe (sempre visível, como no Figma) mas ainda não mostra pendência nenhuma, nem "nada pendente": ele simplesmente ainda não abriu. */
	disponivel: boolean;
	/** Sempre `[]` quando `disponivel` é `false`. */
	itens: ChecklistContatoItem[];
}

export interface ChecklistComunicacaoDia {
	dia: string;
	/** Sempre os 3 blocos fixos (Figma mantém os 3 sempre visíveis) — `disponivel`/`itens` de cada um é que refletem se já chegou a hora. */
	blocos: ChecklistBloco[];
	/**
	 * Todos os contatos "de hoje" (não herdados) ainda não concluídos, independente de qualquer
	 * bloco já ter chegado ou não — fonte pra quem precisa do total/prévia agnóstico de horário
	 * (ex.: prévia da Home), sem depender de `blocos[0]` existir.
	 */
	itensPendentesHoje: ChecklistContatoItem[];
	/** Contatos com item ainda não concluído herdado do checklist de um dia anterior — Figma: seção "Pendências anteriores" (frame "4 · Checklist (vermelho)"). */
	pendenciasAnteriores: ChecklistContatoItem[];
	manuais: ChecklistManualItem[];
}
