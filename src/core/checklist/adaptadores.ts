import "server-only";

import { calcularScore } from "./consultas";
import type { ChecklistPreferenciasDoc, ChecklistResumo, ChecklistResumoComSinais } from "./schema";

import type { PendenciaAcionavel } from "@/core/financeiro/pendencias/schema";
import type { RitualSemana } from "@/core/financeiro/ritual/schema";
import type { FechamentoConsolidado } from "@/core/financeiro/fechamento/schema";
import type { ContagemAguardandoResposta } from "@/core/comunicacao/pendencias";

/**
 * Adaptadores dos 3 checklists de sistema cobertos por esta spec (Ritual, Fechamento, Checklist do
 * Dia) — cada função só reformata dados já buscados hoje em `src/app/(protected)/page.tsx`, sem
 * nenhuma leitura nova no Firestore. `preferencias` vem de `checklistsPreferencias/{id}`
 * (`buscarPreferenciasSistema`, `core/checklist/consultas.ts`) — ausente = nunca pinado/arquivado.
 */

/** Lê `pinado`/`arquivado` de forma defensiva — um doc de preferência gravado só com um dos dois campos (ex.: só `pinado` alterado via merge) não deve fazer o outro virar `undefined`. */
function lerPreferencias(preferencias?: ChecklistPreferenciasDoc): { pinado: boolean; arquivado: boolean } {
	return { pinado: preferencias?.pinado ?? false, arquivado: preferencias?.arquivado ?? false };
}

export function resumoRitualFinanceiro(
	ritual: RitualSemana,
	pendenciasAcionaveis: PendenciaAcionavel[],
	preferencias?: ChecklistPreferenciasDoc,
): ChecklistResumo {
	const { pinado, arquivado } = lerPreferencias(preferencias);
	const passosPendentes = ritual.itens.filter((item) => !item.concluido).length;
	const totalPendentes = pendenciasAcionaveis.length + passosPendentes;

	const comSinais: ChecklistResumoComSinais = {
		id: "financeiro-ritual",
		origem: "sistema",
		area: "financeiro",
		titulo: "Checklist Financeiro",
		tema: "Ritual",
		descricao: "Pendências reais (repasses, Pix, avulsas) e a rotina semanal de conferência.",
		totalPendentes,
		temItens: ritual.itens.length > 0 || pendenciasAcionaveis.length > 0,
		pinado,
		arquivado,
		score: 0,
		sheetId: "financeiro-ritual",
		// Sem sinal de evento vinculado disponível ainda pro Ritual — seção 6 da spec.
		temEventoHojeOuAmanha: false,
		diasSemAtualizacao: 0,
	};
	return { ...comSinais, score: calcularScore(comSinais) };
}

export function resumoFechamentoMensal(fechamento: FechamentoConsolidado, preferencias?: ChecklistPreferenciasDoc): ChecklistResumo {
	const { pinado, arquivado } = lerPreferencias(preferencias);
	const totalPendentes = fechamento.linhas.filter((linha) => !linha.concluido).length;

	const comSinais: ChecklistResumoComSinais = {
		id: "financeiro-fechamento",
		origem: "sistema",
		area: "financeiro",
		titulo: `Fechamento Mensal — ${fechamento.periodoLabel}`,
		tema: "Fechamento",
		descricao: "Itens fixos de fechamento e a reconciliação das semanas do mês.",
		totalPendentes,
		temItens: fechamento.linhas.length > 0,
		pinado,
		arquivado,
		score: 0,
		sheetId: "financeiro-fechamento",
		temEventoHojeOuAmanha: false,
		diasSemAtualizacao: 0,
	};
	return { ...comSinais, score: calcularScore(comSinais) };
}

export function resumoChecklistComunicacao(aguardando: ContagemAguardandoResposta, preferencias?: ChecklistPreferenciasDoc): ChecklistResumo {
	const { pinado, arquivado } = lerPreferencias(preferencias);
	const totalPendentes = aguardando.atencao + aguardando.urgente;
	// Sempre tem itens — as duas linhas de urgência são fixas (somem só visualmente com N = 0) e o
	// atalho de cadastro é permanente; zero pendência é "Tudo em dia", nunca "Sem itens".
	const temItens = true;

	const comSinais: ChecklistResumoComSinais = {
		id: "comunicacao-dia",
		origem: "sistema",
		area: "comunicacao",
		titulo: "Checklist do Dia",
		tema: "Comunicação do Dia",
		descricao: "Contatos aguardando resposta por nível de urgência, com atalho pro board de Vagões.",
		totalPendentes,
		temItens,
		pinado,
		arquivado,
		score: 0,
		sheetId: "comunicacao-dia",
		// "Evento vinculado" só existe depois que spec-checklist-comunicacao.md seção 5 existir — seção 6 da spec.
		temEventoHojeOuAmanha: false,
		diasSemAtualizacao: 0,
	};
	return { ...comSinais, score: calcularScore(comSinais) };
}

/** Ids fixos dos 3 checklists de sistema cobertos por esta spec — usados pra buscar `checklistsPreferencias` de uma vez (`buscarPreferenciasSistema`). */
export const IDS_CHECKLISTS_SISTEMA = ["financeiro-ritual", "financeiro-fechamento", "comunicacao-dia"] as const;
