/**
 * Colunas da grade de cards de checklist (Dashboard e `/checklists`), a partir de `sm` — fonte única
 * pra todo lugar que monta essa grade, em vez de `sm:grid-cols-2 lg:grid-cols-3` repetido.
 *
 * Largura mínima por card de 22rem (352px): o rodapé do `ChecklistCard` ("12/15 pendentes" ~121px +
 * gap 8px + "Ver checklist completo" ~165px, mais 48px de padding) precisa de ~344px pra caber numa
 * linha só. Com colunas fixas, o card encolhia junto com a tela até o rodapé quebrar; aqui o número
 * de colunas é que diminui. `auto-fill` (não `auto-fit`) mantém as colunas vazias, então um card
 * sozinho na fileira não estica pra largura toda. `min(22rem,100%)` evita estourar a largura quando o
 * container for menor que o mínimo.
 */
export const COLUNAS_GRADE_CHECKLISTS = "sm:grid-cols-[repeat(auto-fill,minmax(min(22rem,100%),1fr))]";
