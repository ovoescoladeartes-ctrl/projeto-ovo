# Spec — Checklist do Dia (Comunicação)

> Este arquivo não existia no repo até 2026-09-23, embora o código já o citasse (ex.:
> `core/checklist/adaptadores.ts`). Até agora ele registra só o recorte abaixo. As seções
> anteriores da spec, se existirem em outro lugar, precisam ser trazidas pra cá.

## Recorte implementado em 2026-09-23 (`feat/checklist-dia-comunicacao`)

**Problema:** o card e o painel listavam contato por contato (nome, canal, dias esperando), o que
duplicava o board de Vagões. Agora o checklist mostra uma visão agregada e leva a pessoa pro board
já filtrado.

### 1. Filtro de urgência em Vagões

- Um `Select` "Urgência" em `VagoesFiltroBar.tsx`, ao lado do filtro de Interesse e no mesmo
  padrão dele: estado na URL (`?urgencia=atencao|urgente`), sem parâmetro = "todas". Valor
  inválido na URL é ignorado (`parseNivelPendencia`, `core/comunicacao/urgencia.ts`).
- O filtro é aplicado no servidor (`vagoes/page.tsx`) junto com o de Interesse (E lógico).
- Níveis: `calcularUrgencia` sem mudança nenhuma — `recente` (0–24h, não é pendência),
  `atencao` (24–72h), `urgente` (72h+).

### 2. Contagem agregada por urgência

- As linhas de Ações "N aguardando resposta — urgente" e "N aguardando resposta — atenção" levam
  pra `/vagoes?urgencia=urgente` e `/vagoes?urgencia=atencao`.
- **Uma seleção só pros dois lados:** `nivelPendencia()` em `core/comunicacao/pendencias.ts`
  (estágio `novo`/`em_conversa`/`experimental`, mais urgência ≠ `recente`: mesma regra de
  `contatoEhPendente`). Quem usa: `contarAguardandoPorUrgencia()` (card) e o filtro do board.
  Contato arquivado, convertido ou inativo continua de fora.
- Linha com N = 0 não aparece. Badge: Y = 2 (os dois níveis), X = níveis com N > 0. Zero nos dois
  mostra "Tudo em dia".
- Ordem: urgente, atenção, atalho de cadastro.

### 3. Atalho "Cadastrar novos contatos"

- Linha de Ações permanente que leva pra `/vagoes?novo=1`, que abre o `NovoContatoDialog` já
  existente (prop `abertoInicial`). Ao fechar o formulário, o `?novo=1` sai da URL. Não conta no
  badge.

### 4. Painel lateral

- Só a seção "Ações", com as mesmas linhas do card. Saíram a lista de contatos, a Conferência
  (checkbox), os blocos de horário e os itens avulsos.

### Mudança de comportamento

- **Marcar contato como concluído deixou de existir.** Antes, um contato marcado no checkbox
  saía do checklist até o dia seguinte. Agora o jeito de resolver é mover o contato de estágio em
  Vagões (`estagioAtualizadoEm` vira "agora" e o contato volta a `recente`).
- **Itens avulsos (manuais) saíram da UI.** Os docs em `checklistComunicacaoDias` continuam no
  Firestore, mas não são mais lidos nem materializados (a Home e `/checklists` param de ler 9 docs
  por render e de gravar no `after()`).
- Código sem uso depois deste recorte (mantido por enquanto, candidato a remoção):
  `core/comunicacao/checklist/{consultas,materializar}.ts`, `core/db/checklistComunicacao.ts`,
  `app/(protected)/vagoes/checklist/actions.ts` e `components/dashboard/AdicionarItemChecklistDialog.tsx`.

## Fora deste recorte

Os dois primeiros itens dependem de um **campo novo em `Contato`**, que ainda não existe:

- Aula experimental/visita em destaque no dia.
- Links diretos de WhatsApp/e-mail no card de contato.
- Qualquer coisa que dependa dos dois itens acima.
