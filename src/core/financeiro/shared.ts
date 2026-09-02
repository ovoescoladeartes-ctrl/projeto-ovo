// Origem deixou de ser exclusiva de financeiro (Pessoa e Turma também usam,
// ver integração Wix) — vive em core/shared/origem.ts. Reexportado aqui para
// não quebrar os imports existentes deste módulo.
export { ORIGENS, type Origem } from "@/core/shared/origem";

/**
 * Chave `yyyy-MM` em horário local — fonte única pra esse formato dentro do domínio financeiro
 * (usado por `saldo.ts` pro mês corrente e por `fechamento/periodo.ts` pra período de referência).
 * Não confundir com `core/shared/mesesJanela.ts`, que usa `Date.UTC` de propósito pra montar
 * janelas de meses estáveis independente de fuso — semântica diferente, não deve ser unificada
 * sem revisar por que a janela é UTC e o período/mês corrente aqui é local.
 */
export function formatarAnoMes(data: Date): string {
	return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}
