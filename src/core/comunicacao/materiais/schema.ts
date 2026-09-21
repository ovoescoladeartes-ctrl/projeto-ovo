import { z } from "zod";

export const criarItemMaterialSchema = z.object({
	titulo: z.string().min(1, "Título é obrigatório."),
	/** `null` = "Geral" (item sem turma específica) — mesmo padrão de `SEM_TURMA` em `NovaPessoaDialog`. */
	turmaId: z.string().nullable(),
	turmaNome: z.string().nullable(),
});

export type CriarItemMaterialInput = z.infer<typeof criarItemMaterialSchema>;

export const alternarItemMaterialSchema = z.object({
	id: z.string().min(1, "Item inválido."),
	comprado: z.boolean(),
});

export type AlternarItemMaterialInput = z.infer<typeof alternarItemMaterialSchema>;

export const excluirItemMaterialSchema = z.object({
	id: z.string().min(1, "Item inválido."),
});

export type ExcluirItemMaterialInput = z.infer<typeof excluirItemMaterialSchema>;

/** Item do Checklist de Materiais — adicionado livremente (sem lista fixa), marcado como comprado até 100%. Feature nova, não existia antes (substitui o antigo botão "Adicionar Material" do Checklist do Dia, que só criava um item de texto livre genérico sem esse fluxo). */
export interface ItemMaterial {
	id: string;
	titulo: string;
	comprado: boolean;
	criadoEm: string | null;
	compradoEm: string | null;
	/** `null` = "Geral" — item 3 da 8ª rodada de feedback: turma escolhida na criação, pra permitir agrupar por turma quando a faixa própria de Materiais (spec-checklist-materiais.md) existir. */
	turmaId: string | null;
	turmaNome: string | null;
}
