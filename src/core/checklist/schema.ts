import { z } from "zod";

export const CHECKLIST_AREAS = ["financeiro", "comunicacao", "comum"] as const;
export type ChecklistArea = (typeof CHECKLIST_AREAS)[number];

export const CHECKLIST_ORIGENS = ["sistema", "customizado"] as const;
export type ChecklistOrigem = (typeof CHECKLIST_ORIGENS)[number];

/**
 * Formato unificado que Ritual, Fechamento, Checklist do Dia (adaptados, ver
 * `core/checklist/adaptadores.ts`) e os customizados (coleção `checklists`) produzem, para o
 * dashboard e a página de lista renderizarem sem saber de onde cada um veio. Materiais não entra
 * aqui — ver `spec-checklist-materiais.md`.
 */
export interface ChecklistResumo {
	/** Estável entre renders — para "sistema" é uma constante (ex.: "financeiro-ritual"), para
	 * "customizado" é o id do doc em `checklists`. */
	id: string;
	origem: ChecklistOrigem;
	area: ChecklistArea;
	titulo: string;
	/** Rótulo curto pra tag do card — ex. "Ritual", "Fechamento". */
	tema: string;
	descricao: string;
	totalPendentes: number;
	/** `null` quando o checklist não tem nenhum item (diferente de `totalPendentes === 0` com itens existentes — ver seção 7 da spec). */
	temItens: boolean;
	pinado: boolean;
	arquivado: boolean;
	/** Calculado on-the-fly a cada leitura, nunca persistido (ver seção 6 da spec). */
	score: number;
	/** Se presente, "Ver checklist completo" navega pra cá. Se ausente, `sheetId` decide o comportamento. */
	href?: string;
	/** Id usado pelo componente client pra saber qual Sheet abrir — os 3 checklists de sistema
	 * cobertos por esta spec usam Sheet. */
	sheetId?: "financeiro-ritual" | "financeiro-fechamento" | "comunicacao-dia";
}

/** Sinais usados só pra calcular o score (seção 6 da spec) — não fazem parte do contrato persistido/exibido. */
export interface ChecklistResumoComSinais extends ChecklistResumo {
	temEventoHojeOuAmanha: boolean;
	diasSemAtualizacao: number;
}

export const checklistItemSchema = z.object({
	id: z.string().min(1),
	titulo: z.string().trim().min(1),
	concluido: z.boolean(),
	concluidoEm: z.string().nullable(),
	concluidoPor: z.string().nullable(),
	/** Ausente/omitido = item sem ação. Presente = mostra botão navegável (ver `ChecklistItemToggle`). */
	actionHref: z.string().optional(),
	actionLabel: z.string().optional(),
	/** Texto de ajuda opcional (ícone de interrogação, item 8 do feedback de revisão) — só pros itens cujo nome sozinho não deixa claro o que fazer. */
	explicacao: z.string().optional(),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const criarChecklistSchema = z.object({
	titulo: z.string().trim().min(1, "Título é obrigatório."),
	area: z.enum(CHECKLIST_AREAS),
	tema: z.string().trim().min(1, "Tema é obrigatório."),
	descricao: z.string().trim().default(""),
});

export const editarChecklistSchema = criarChecklistSchema.extend({ id: z.string().min(1) });

export const alternarItemChecklistCustomizadoSchema = z.object({
	checklistId: z.string().min(1),
	itemId: z.string().min(1),
	concluido: z.boolean(),
});

export const adicionarItemChecklistCustomizadoSchema = z.object({
	checklistId: z.string().min(1),
	titulo: z.string().trim().min(1, "Título do item é obrigatório."),
	actionHref: z.string().optional(),
	actionLabel: z.string().optional(),
	explicacao: z.string().trim().optional(),
});

export const alternarPinChecklistSchema = z.object({
	id: z.string().min(1),
	/** Precisa saber se é de sistema (grava em `checklistsPreferencias`) ou customizado (grava
	 * direto no doc `checklists/{id}`). */
	origem: z.enum(CHECKLIST_ORIGENS),
	pinado: z.boolean(),
});

export const arquivarChecklistSchema = z.object({
	id: z.string().min(1),
	origem: z.enum(CHECKLIST_ORIGENS),
	arquivado: z.boolean(),
});

export interface ChecklistPreferenciasDoc {
	pinado: boolean;
	arquivado: boolean;
}
