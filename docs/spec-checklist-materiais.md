# Spec — Materiais

> Este arquivo não existia no repo até 2026-09-23, embora o código já o citasse há mais de uma
> rodada (`core/checklist/schema.ts`, `ChecklistCard.tsx`, `page.tsx`, `checklists/page.tsx`) como
> referência futura. Registra aqui o recorte implementado em `feat/checklist-materiais`.

## Estado anterior (o que já existia antes deste recorte)

Materiais **não nasceu nesta tarefa** — já existia desde `feat(comunicacao): adiciona Checklist de
Materiais` e foi reforçado em "Fase 1: camada de repositório cacheada" (2026-09-22), inclusive com
os campos `turmaId`/`turmaNome` já adicionados de propósito "pra permitir agrupar por turma quando
a faixa própria de Materiais... existir" (comentário original em `schema.ts`). Isto é: a base de
dados e boa parte da UI de captura já estava pronta antes de esta spec ser escrita.

**Não é uma coleção nova.** Continua sendo `materiaisChecklist` (já em `core/db/tags.ts`), lida via
`lerItensMateriais()` (`core/db/materiais.ts`, cache já no padrão do projeto). Nenhuma coleção foi
criada por este recorte — a preocupação de cota do pedido original não se aplicou.

Já existiam também, sem alteração: `AdicionarMaterialDialog` (botão "Adicionar material", turma-ou-
Geral + texto livre), e as actions autenticadas `criarItemMaterial`/`alternarItemMaterial`/
`excluirItemMaterial` (`app/(protected)/vagoes/materiais/actions.ts`, gate `VAGOES_ROLES`).

## Divergência do pedido original — decisão registrada aqui

O pedido que originou este recorte assumia (a) que Materiais implementaria o contrato
`ChecklistResumo` normalmente, reusando `ChecklistCard` e estendendo `sheetId` para
`materiais-{grupoId}`, e (b) que a gestão viveria numa página nova, `/vagoes/materiais`. As duas
premissas **não bateram com decisões já registradas no código**:

- `core/checklist/schema.ts` e `ChecklistCard.tsx` já documentavam, antes desta tarefa, que
  "Materiais não entra" no contrato `ChecklistResumo` — teria "seu próprio card por turma".
- `checklists/page.tsx` já documentava que a ideia de uma URL própria (`/vagoes/materiais`) tinha
  sido descartada em favor de gerenciar Materiais dentro de `/checklists`.

Decisão (confirmada com o usuário antes de implementar): **manter as duas decisões já registradas.**
Materiais continua fora do contrato `ChecklistResumo` — `sheetId` **não foi alterado**, `ChecklistCard.tsx`
**não foi modificado**. Em compensação, o card por turma (`ChecklistMateriaisTurma`, novo) replica
deliberadamente a mesma anatomia visual do `ChecklistCard` genérico (badge "Materiais" acima do
título, título com a mesma altura mínima/line-clamp, caixa de itens de 12rem com rolagem, badge de
contagem em âmbar, botão "Ver checklist completo") — só sem o botão de pin, que não faz sentido
para um grupo dinâmico por turma sem conceito de pin/arquivar/score. Lado a lado com os cards de
Ritual/Fechamento/Comunicação na mesma faixa, é visualmente indistinguível deles. Não há gestão em
`/vagoes/materiais` — continua em `/checklists` (aba Comunicação).

## O que foi implementado

### 1. Agrupamento por turma (`core/comunicacao/materiais/agrupar.ts`, novo)

- `agruparMateriaisPendentesPorTurma(itens)`: função pura, sem leitura própria — recebe o array já
  lido por `lerItensMateriais()`. Filtra só `comprado: false` e agrupa por `turmaId` (`null` =
  "Geral"). Turma sem nenhum pendente não aparece no resultado — nunca um card vazio. Ordenação:
  turmas em ordem alfabética, "Geral" sempre por último.
- `materiaisCompradosRecentes(itens, limite = 10)`: os N últimos comprados por `compradoEm` desc —
  usado só na página de gestão, pra desfazer/excluir um item resolvido por engano.

### 2. Card por turma (`components/dashboard/ChecklistMateriaisTurma.tsx`, novo)

- Um card por grupo (`ChecklistMateriaisTurma`), título `"Materiais — {turma}"` ou
  `"Materiais — Geral"`, tag "Materiais". Cada card é individual — nenhum carrossel/scroll interno
  reunindo turmas.
- Item = `ChecklistItemToggle` (Conferência, checkbox), já usado por Ritual/Fechamento — mesma
  anatomia (título, controle à direita, botão de excluir já suportado por este componente antes
  desta tarefa, "só usado hoje por Materiais").
- Substitui o antigo `ChecklistMateriais.tsx` (removido) — que era **um card único** listando todas
  as turmas juntas dentro do mesmo Sheet (o padrão que o pedido original queria evitar).

### 3. Duas faixas na aba Comunicação

- Dashboard (`/`) e `/checklists` (aba Comunicação) já tinham a estrutura de duas seções
  empilhadas ("Materiais" em cima, "Comunicação" embaixo) de uma rodada anterior — não precisou ser
  criada. O que mudou: a seção Materiais passou de 1 card único para a faixa (`FAIXA_CHECKLISTS`/
  `ITEM_FAIXA_CHECKLISTS`, mesmo componente reutilizável do motor) com 0–N cards por turma.
- No Dashboard: cabeçalho da seção com "Materiais" + botão "Adicionar material" — visão do dia a
  dia, sem as ações de gestão completa.
- Em `/checklists`: mesma faixa + "Adicionar material" + "Copiar link do formulário" + lista
  "Comprados recentemente" (excluível) — é a página de gestão.

### 4. Formulário público (`/materiais-professor`, novo)

- `src/app/(public)/materiais-professor/page.tsx` — Server Component, sem gate de sessão. Busca
  turmas via `lerTurmas()` e expõe ao cliente só `{id, nome}` das ativas, nunca o objeto `Turma`
  inteiro (que carrega `mensalidadeCentavos`/`educadorPessoaId`/etc.).
- `MateriaisProfessorForm.tsx` (Client Component) — turma-ou-Geral + texto livre, confirmação
  simples na própria tela ao enviar (sem redirecionar pra área logada).
- `actions.ts` — `criarItemMaterialPublico`, nova action **sem** `getServerSession()`, único write
  site do app sem autenticação. `turmaNome` nunca vem do cliente: resolvido a partir de `turmaId`
  contra `lerTurmas()` no servidor; `turmaId` que não bate com nenhuma turma ativa é rejeitado.
  Grava com `criadoPor: null` (sinaliza "sem usuário autenticado", nunca um valor de sistema
  inventado).
- Schema novo e separado da action autenticada: `criarItemMaterialPublicoSchema`
  (`core/comunicacao/materiais/schema.ts`) — título limitado a 200 caracteres.

### Segurança — sem proteção contra abuso automatizado

`/materiais-professor` é uma rota pública que escreve no banco. A única proteção hoje é validação
de servidor (zod: campos obrigatórios, título até 200 caracteres, `turmaId` validado contra turmas
reais). **Não há rate limit, captcha ou qualquer outro mecanismo contra abuso automatizado** — o
projeto não tinha nenhum desses mecanismos em nenhum outro formulário público antes desta tarefa,
e não foi criado um agora, por pedido explícito de não inventar um sistema complexo sem decisão
prévia. Se isso virar um problema real (spam de materiais falsos), precisa de uma decisão separada.

## Fora de escopo (não alterado)

Ritual, Fechamento, Checklist do Dia (Comunicação), `ChecklistResumo`/`ChecklistCard`/`sheetId`,
`/vagoes/materiais` como página de gestão (nunca criada — decisão mantida), qualquer notificação
(WhatsApp/e-mail) ao reportar material, o checklist customizado "Materiais" da coleção genérica
`checklists` (se algum dia existir um — hoje não existe nenhum; o que existia com esse nome era o
próprio `ChecklistMateriais.tsx`, removido nesta tarefa por ter sido substituído).

## Inconsistências encontradas (não corrigidas, fora do escopo desta tarefa)

- `core/comunicacao/materiais/consultas.ts` (`buscarItensMateriais`) já estava sem nenhum
  importador antes desta tarefa — o comentário em `core/db/materiais.ts` que diz "`/checklists`
  (Fase 3) ainda a usa diretamente" está desatualizado (`/checklists` usa `lerItensMateriais()`,
  não essa função). Não removido aqui por não fazer parte do pedido.
- `spec-checklist-motor.md`, citado por comentários em `core/checklist/{schema,adaptadores,
  consultas}.ts` e no `page.tsx`, nunca existiu no repositório (não há commit que o tenha criado).
