import { z } from "zod";

export const criarItemMaterialSchema = z.object({
	titulo: z.string().min(1, "Título é obrigatório."),
});

export type CriarItemMaterialInput = z.infer<typeof criarItemMaterialSchema>;

export const alternarItemMaterialSchema = z.object({
	id: z.string().min(1, "Item inválido."),
	comprado: z.boolean(),
});

export type AlternarItemMaterialInput = z.infer<typeof alternarItemMaterialSchema>;

/** Item do Checklist de Materiais — adicionado livremente (sem lista fixa), marcado como comprado até 100%. Feature nova, não existia antes (substitui o antigo botão "Adicionar Material" do Checklist do Dia, que só criava um item de texto livre genérico sem esse fluxo). */
export interface ItemMaterial {
	id: string;
	titulo: string;
	comprado: boolean;
	criadoEm: string | null;
	compradoEm: string | null;
}
