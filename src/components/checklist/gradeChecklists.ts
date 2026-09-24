/**
 * Colunas da grade de cards de checklist da página `/checklists` (lista de gestão — lá empilhar em
 * 1 coluna no estreito é o comportamento esperado, igual ao mobile dela), a partir de `sm`.
 *
 * Largura mínima por card de 22rem (352px): o rodapé do `ChecklistCard` ("12/15 pendentes" ~121px +
 * gap 8px + "Ver checklist completo" ~165px, mais 48px de padding) precisa de ~344px pra caber numa
 * linha só. `auto-fill` (não `auto-fit`) mantém as colunas vazias, então um card sozinho não estica
 * pra largura toda. `min(22rem,100%)` evita estourar quando o container for menor que o mínimo.
 */
export const COLUNAS_GRADE_CHECKLISTS = "sm:grid-cols-[repeat(auto-fill,minmax(min(22rem,100%),1fr))]";

/**
 * Faixa de checklists de uma área no Dashboard (Financeiro, Comunicação) — só dois estados, nunca um
 * terceiro (empilhado em 1 coluna): **lado a lado** quando todos os cards cabem com a largura mínima,
 * **rolagem horizontal** quando não cabem. É sempre a mesma faixa `flex` com `overflow-x-auto` (a do
 * mobile); o que muda é só se sobra ou falta espaço — por isso o ponto de virada depende de quantos
 * cards a fileira tem, sem breakpoint fixo. Abaixo de `sm`: sangra até a borda da tela (margem
 * negativa + `pr-6`, o padding do conteúdo no mobile) e trava por card (`snap`), como já era.
 */
export const FAIXA_CHECKLISTS = "mr-[-1.5rem] flex snap-x snap-mandatory gap-4 overflow-x-auto pr-6 pb-2 sm:mr-0 sm:pr-0";

/**
 * Item da `FAIXA_CHECKLISTS`. Largura fixa no modo rolagem, nunca relativa à tela — é o espaço que
 * sobra que decide quanto do próximo card aparece na borda (efeito de carrossel).
 *
 * - Abaixo de `sm`: 22rem (352px) fixos, o mesmo mínimo da grade — exceto em celular estreito
 *   (< 432px), onde 352px não deixaria o próximo card aparecer: aí vira `100vw - 5rem`, que sempre
 *   deixa ~40px do próximo à mostra (5rem = 24px de padding + 16px de gap + 40px de "espiada").
 *   Antes era `85vw`, que numa tela de ~600px virava um card de 510px com uma tira de ~26px do próximo.
 * - A partir de `sm`: cresce igualmente pra preencher a fileira (`flex-1`), nunca abaixo de 22rem e
 *   nunca acima de 1/3 da faixa (card sozinho não estica a 100%). No modo rolagem não sobra espaço
 *   pra crescer, então fica fixo em 22rem; quando o teto de 1/3 é menor que 22rem, `min-width` vence
 *   o `max-width` (regra do CSS).
 */
export const ITEM_FAIXA_CHECKLISTS =
	"w-[min(22rem,calc(100vw_-_5rem))] shrink-0 snap-start sm:w-auto sm:min-w-[22rem] sm:max-w-[calc((100%_-_2rem)/3)] sm:flex-1";
