// Origem deixou de ser exclusiva de financeiro (Pessoa e Turma também usam,
// ver integração Wix) — vive em core/shared/origem.ts. Reexportado aqui para
// não quebrar os imports existentes deste módulo.
export { ORIGENS, type Origem } from "@/core/shared/origem";

/** Data curta (dd/mm) usada nos textos de meta de Repasse/Ritual/Fechamento — uma única implementação, sem depender de nenhum módulo `server-only`. */
export function formatarDataCurta(data: Date): string {
	return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(data);
}

/**
 * Rótulo de destino de um Repasse ("Educador" pelo nome, "Espaço" ou "Outro") — tipado de forma
 * estrutural (sem importar `Repasse`/`DestinoTipo` de `repasses/schema.ts`) pra não criar
 * dependência circular, já que `repasses/schema.ts` importa `Origem` deste mesmo módulo.
 */
export function destinoRepasseLabel(
	repasse: { destinoTipo: "educador" | "espaco" | "outro"; destinoPessoaId: string | null },
	pessoasNomes: Record<string, string>,
): string {
	if (repasse.destinoTipo === "educador") {
		return repasse.destinoPessoaId !== null ? (pessoasNomes[repasse.destinoPessoaId] ?? "Educador") : "Educador";
	}
	return repasse.destinoTipo === "espaco" ? "Espaço" : "Outro";
}
