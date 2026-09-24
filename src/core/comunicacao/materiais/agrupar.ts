import type { ItemMaterial } from "./schema";

/** Um grupo (turma, ou "Geral") com pelo menos 1 item de material pendente. */
export interface GrupoMateriaisPendentes {
	/** `null` = "Geral" — mesmo marcador usado em `ItemMaterial.turmaId`. */
	turmaId: string | null;
	turmaNome: string;
	/** Só itens com `comprado: false` — todo item deste array é, por construção, pendente. */
	itens: ItemMaterial[];
}

/**
 * Agrupa os itens de materiais ainda pendentes por turma (ou "Geral"), em memória — função pura,
 * sem leitura própria (recebe o array já lido por `lerItensMateriais()`, `core/db/materiais.ts`).
 * Grupo sem nenhum item pendente não entra no resultado: nunca um card vazio
 * (`docs/spec-checklist-materiais.md`).
 */
export function agruparMateriaisPendentesPorTurma(itens: readonly ItemMaterial[]): GrupoMateriaisPendentes[] {
	const pendentes = itens.filter((item) => !item.comprado);
	const porTurma = new Map<string, GrupoMateriaisPendentes>();

	pendentes.forEach((item) => {
		const chave = item.turmaId ?? "__geral__";
		const grupo = porTurma.get(chave);
		if (grupo !== undefined) {
			grupo.itens.push(item);
			return;
		}
		porTurma.set(chave, { turmaId: item.turmaId, turmaNome: item.turmaNome ?? "Geral", itens: [item] });
	});

	// Turmas em ordem alfabética, "Geral" sempre por último (categoria genérica depois das específicas).
	return Array.from(porTurma.values()).sort((a, b) => {
		if (a.turmaId === null) return 1;
		if (b.turmaId === null) return -1;
		return a.turmaNome.localeCompare(b.turmaNome, "pt-BR");
	});
}

/**
 * Os N materiais comprados mais recentemente (`compradoEm` desc) — usado só na página de gestão
 * (`/checklists`, seção Materiais), pra permitir excluir um item já resolvido por engano. Não entra
 * no dashboard/faixa de cards, que só mostra pendência.
 */
export function materiaisCompradosRecentes(itens: readonly ItemMaterial[], limite = 10): ItemMaterial[] {
	return itens
		.filter((item) => item.comprado)
		.sort((a, b) => (b.compradoEm ?? "").localeCompare(a.compradoEm ?? ""))
		.slice(0, limite);
}
