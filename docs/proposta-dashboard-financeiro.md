# Proposta: melhorias de visualização no financeiro (Home + Caixa) + discovery de aba "Geral"

> Documento de pesquisa e proposta, para implementar depois. Não é spec fechada — é insumo
> para decisão. Ver `docs/context.md` (regras invioráveis) e `docs/mini-prd.md` (roadmap)
> antes de tocar em qualquer item daqui.

## Por que este documento existe

O Trilho já tem uma integração de leitura Wix → Firestore em produção (v4 do roadmap,
implementada fora de ordem por decisão explícita — ver `docs/discovery-integracao-wix.md`).
Os `Recebimentos` sincronizados da Wix já carregam `origem`, `status`, `valorCentavos`,
`formaPagamento`, `turmaId`, `pessoaId`, `dataRecebimento`. Hoje essa base é usada só para
números soltos (KPI cards) e tabelas simples — nada de tendência, comparação por período ou
composição. Este documento levanta boas práticas de dashboard financeiro/fluxo de caixa,
mapeia o que a API da Wix expõe (para referência futura) e propõe adições concretas ao que
já existe, usando só dado que já está no Firestore.

**Escopo desta proposta:**
- Sem páginas novas — só cards/conteúdo dentro do **Home** (`/`, tab Financeiro) e do
  **Caixa** (`/caixa`), e só onde o dado realmente justificar.
- Sem chamadas novas à API da Wix — só o que já está em `recebimentos` e `repasses` no
  Firestore.
- **Adendo** (seção [Discovery adicional: aba "Geral"](#discovery-adicional-aba-geral-visão-da-escola)):
  a pedido do usuário, foi feito um discovery separado sobre uma possível aba "Geral" na Home
  (melhores turmas, sazonalidade, alunos por período). É uma aba nova dentro de uma página que
  já existe (Home já usa `Tabs`), não uma rota nova — mas é um escopo maior que "um card a mais"
  e cruza dado financeiro com operacional, então tem uma seção própria com suas próprias
  ressalvas.

## ⚠️ Tensão com o roadmap — ler antes de implementar

`docs/mini-prd.md` lista **"Qualquer dashboard ou indicador agregado"** explicitamente como
*Won't-have v1*. A regra invioável #5 (`docs/context.md`) diz que cada camada só avança
quando a anterior está confiável em uso real:

> base → operação → ritual → **visibilidade** → inteligência

Dashboard financeiro é oficialmente **v3** (camada "visibilidade"). A "open question #1" do
PRD — *"o ritual manual se sustenta?"* — ainda não foi respondida na prática (critério de
sucesso do MVP ainda não comprovado por 3 semanas de uso real).

Isso já foi pulado conscientemente uma vez: a integração Wix (v4, camada "integrações", mais
tardia ainda que "visibilidade") foi implementada fora de ordem porque o usuário decidiu
avançar mesmo sabendo do risco, depois de ser avisado. As propostas abaixo repetem esse
mesmo tipo de decisão — não são "seguir o roadmap", são pular a régua de novo. Isso pode ser
a escolha certa (mesma lógica: dado já existe, ganho é real, risco é mascarar se o ritual
manual se sustenta sozinho), mas deve ser uma decisão consciente de quem já tomou essa
decisão antes — não um default.

## Boas práticas de dashboard financeiro / fluxo de caixa

Aplicado ao contexto real daqui (escola pequena, 2 gestoras, ritual semanal de segunda):

- **5–8 KPIs no máximo por tela** — mais que isso e a tela vira ruído. O Caixa já tem 3
  (Saldo vivo, Recebido no mês, Repasses pendentes); dá pra adicionar 2–3 sem estourar.
- **Gráfico de tendência (linha/barra) para sazonalidade** — um número absoluto ("recebido
  no mês: R$ 4.200") não diz se está subindo, caindo ou é normal para a época do ano. Uma
  série de 6–12 meses responde isso de imediato.
- **"Cash flow walkthrough"** — visualizar o trajeto saldo de abertura → entradas → saídas →
  saldo de fechamento, em vez de só o saldo final. Ajuda a entender *por que* o saldo mudou,
  não só que mudou.
- **Revisão semanal com dado fresco** — já é o ritual da Camila (toda segunda). O ganho de
  um dashboard aqui é reduzir garimpo manual antes da revisão, não mudar a cadência.
- **Mostrar sempre origem e confiabilidade do dado** — já é a regra invioável #3 do produto.
  Qualquer visualização nova precisa deixar claro o que veio da Wix vs. lançamento manual.

## O que a API da Wix expõe (referência futura — não usado agora)

O app hoje consome só: Contacts API v4, Stores Catalog **V1** (confirmado — o site responde
`CATALOG_V1_SITE_CALLING_CATALOG_V3_API` se chamado com V3) e eCommerce Orders search
(`status: APPROVED`), lendo apenas `id`, `number`, `status`, `paymentStatus`, `createdDate`,
`buyerInfo`, `lineItems[].price.amount` — ver `src/core/wix/types.ts`.

A Orders API completa (Order Object, eCommerce v2/v3) expõe bem mais dado financeiro que
**não é mapeado hoje**, listado aqui só como possível próximo passo se algum dia fizer
sentido buscar mais da Wix:

- `paymentStatus` — enum completo: `NOT_PAID`, `PAID`, `PARTIALLY_REFUNDED`,
  `FULLY_REFUNDED`, `PENDING`, `PARTIALLY_PAID`, `PENDING_MERCHANT`, `CANCELED`, `DECLINED`
  (hoje só `PAID`/refunds/resto são mapeados em `mapearStatusRecebimento`, ver
  `src/core/wix/sync.ts`).
- `priceSummary` — subtotal, desconto, imposto, total.
- `balanceSummary` — `paid`, `refunded`, `pending`, `chargeback`, **`platformFees`** e
  **`totalMinusPlatformFees`** (valor líquido após taxa da Wix — hoje o Trilho não sabe
  quanto a Wix retém de taxa por pedido).
- `platformFeeSummary` — breakdown de taxas de plataforma por linha.

**Por que não usar agora:** (a) exigiria trocar a Stores API V1 por eCommerce API v2/v3 ou
mapear campos novos na v1 atual — mudança de superfície de integração, não só de UI; (b) o
usuário decidiu explicitamente ficar só no Firestore nesta rodada. Se no futuro a pergunta
"quanto a Wix retém de taxa" virar relevante para o Caixa, `balanceSummary.platformFees` é
o campo a buscar.

## Estado atual do produto

| Onde | Arquivo | O que mostra hoje |
|---|---|---|
| Home, tab Financeiro | `src/app/(protected)/page.tsx` + `src/core/dashboard/consultas.ts` | 3 KPI cards (Recebido no mês, Saldo vivo, Alunos ativos) + lista de pendências (recebimentos pendentes + repasses a vencer em 7 dias) |
| Caixa | `src/app/(protected)/caixa/page.tsx`, `CaixaTabs.tsx` | 3 KPIs (Saldo vivo, Recebido no mês, Repasses pendentes) + duas tabelas (`RecebimentosHistorico.tsx`, `RepassesHistorico.tsx`) |
| Histórico de recebimentos | `RecebimentosHistorico.tsx` | Tabela HTML simples (Pessoa, Turma, Valor, Forma, Origem, Status, Data). Filtro só por `origem` e `status` — **sem filtro de data**, sem agregação, sem gráfico |
| Agregação | `src/core/financeiro/saldo.ts` | Tudo em memória a partir das listas já buscadas para a tabela — `calcularSaldoVivo`, `calcularRecebidoNoMes`, `listarRepassesAVencer`. Sem série histórica |
| Lib de gráfico | `package.json` | Nenhuma instalada (`recharts`, `chart.js`, `visx`, `d3`, `nivo` — zero ocorrências) |

## Dados disponíveis hoje no Firestore (e limitações)

**`Recebimento`** (`src/core/financeiro/recebimentos/schema.ts`):
`valorCentavos`, `status` (`confirmado`/`pendente`/`cancelado`), `formaPagamento`
(`pix`/`dinheiro`/`cartao`/`transferencia`/`boleto`/`outro`), `origem` (`wix`/`manual`),
`turmaId`, `pessoaId`, `dataRecebimento`.

⚠️ **Não existe `dataVencimento`** — só uma data única (`dataRecebimento`), usada tanto para
"quando aconteceu" (Wix) quanto para "data de lançamento" (manual). Isso significa que
**não dá para montar um relatório de aging/inadimplência clássico** (contas a receber por
tempo em atraso) sem adicionar um campo novo ao modelo — decisão de schema, fora do escopo
desta proposta.

**`Repasse`** (`src/core/financeiro/repasses/schema.ts`): já tem `vencimento` (data) +
`status` (`pendente`/`pago`) — esse lado já suporta uma visão temporal melhor do que a lista
simples de hoje.

## Propostas concretas

Cada item usa só dado que já existe, e cada um resolve um problema real de decisão — nenhum
é "gráfico bonito" sem propósito.

1. **Gráfico de tendência mensal de recebido** (Caixa) — série dos últimos 6–12 meses, só
   `status: confirmado`, agrupado por mês (`dataRecebimento.slice(0, 7)`, mesmo padrão já
   usado em `calcularRecebidoNoMes`). Substitui/complementa o card estático "Recebido no
   mês", que hoje não diz se R$ 4.200 é bom, ruim ou normal para a época.
2. **Composição por origem (Wix × manual) no período** (Caixa) — pizza ou barra empilhada.
   Reforça a regra #3 (mostrar origem/confiabilidade) e serve de termômetro indireto: quanto
   a integração Wix está de fato reduzindo lançamento manual da Camila.
3. **Composição por forma de pagamento no período** (Caixa) — ajuda a entender o mix
   pix/cartão/dinheiro/etc., relevante para conciliação bancária.
4. **Recebido por turma/curso no período** (Caixa, top N) — ajuda a decidir quais ofertas
   priorizar; hoje esse cruzamento só existe implicitamente na tabela linha a linha.
5. **Timeline de repasses a vencer** (Caixa) — expandir a lista atual (7 dias) para uma
   visão temporal simples (7/14/30 dias), usando `vencimento` que já existe em `Repasse`.
6. **Pré-requisito técnico — filtro de período no histórico** — hoje `RecebimentosHistorico`
   só filtra por `origem`/`status`; um filtro de mês/trimestre é baixo esforço e necessário
   para os itens 1–4 funcionarem bem além do mês corrente.
7. **Pré-requisito técnico — lib de gráfico** — nenhuma está instalada. `recharts` é o
   caminho de menor atrito: é o que o componente `chart` do shadcn/ui já embrulha, e o
   projeto já usa shadcn/ui (`components.json`) para todo o resto da UI.

### O que **não** entra agora

- Nenhuma página nova (fora do escopo pedido).
- **Vagões financeiro** (pipeline do dinheiro por aluno) — já é v3 prioridade 2 no roadmap,
  é outra feature inteira, não um card.
- **Aging/inadimplência** de Recebimentos — exigiria campo `dataVencimento` novo no modelo,
  decisão de schema que não cabe numa proposta de visualização.
- Qualquer chamada nova à API da Wix (`balanceSummary`, `platformFeeSummary` etc.) — decisão
  explícita do usuário de ficar só no Firestore nesta rodada.
- Copiloto / consulta em linguagem natural sobre os dados financeiros — v5, "deliberadamente
  por último" no próprio PRD.

## Discovery adicional: aba "Geral" (visão da escola)

> Pedido à parte do usuário: faria sentido uma aba "Geral" mostrando melhores turmas (mais
> alunos, mais dinheiro), gráficos de sazonalidade e alunos por período do ano? Fiz o
> discovery e a resposta é **sim, com ressalvas** — dá pra construir sem nenhum campo novo no
> modelo, mas é um escopo mais largo que os itens de Caixa acima e merece um aviso de roadmap
> mais forte.

### O que já existe pra sustentar isso

**`Turma`** (`src/core/turmas/schema.ts`): `mensalidadeCentavos`, `repasseTipo`/`repasseValor`,
`dataInicio`/`dataFim`, `tipo` (`curso`/`oficina`), `educadorPessoaId`, `ativo`, `origem`.

**`Matricula`** (`src/core/matriculas/schema.ts`): `pessoaId`, `turmaId`, `dataMatricula`,
`dataEncerramento`, `mensalidadeCombinadaCentavos` (valor real combinado na matrícula, não o
preço de tabela da turma), `status` (`ativa`/`encerrada`).

A página `src/app/(protected)/pessoas/turmas/page.tsx` já monta, em memória, um
`Map<turmaId, alunos[]>` a partir de `matriculas` com `status === "ativa"` para exibir a coluna
"Vagas" — esse é exatamente o padrão de agregação que um ranking "turmas com mais alunos"
reaproveitaria.

**Não existe hoje**: nenhuma agregação de receita por turma, nenhuma série temporal de
matrículas/receita, nenhuma página que cruze todas as turmas ao mesmo tempo (só listagem
simples). `contarAlunosMatriculados` (`src/core/pessoas/contadores.ts`, usado no KPI "Alunos
ativos" da Home) conta por `Pessoa` num snapshot único do presente — não serve como série
histórica por período.

### Como construir cada peça (sem campo novo)

1. **"Turmas com mais alunos"** — contar `Matricula` com `status: "ativa"` agrupado por
   `turmaId`, mesmo padrão já usado em `turmas/page.tsx`.
2. **"Turmas com mais dinheiro entrou"** — **usar `Recebimento.turmaId` com `status:
   confirmado`, não `Turma.mensalidadeCentavos`.** `mensalidadeCentavos` é preço de tabela
   (o que deveria entrar), não o que realmente entrou — reaproveita a mesma agregação do item
   4 da seção "Propostas concretas" acima (recebido por turma), só que como ranking numa aba
   própria em vez de um card dentro do Caixa.
3. **Sazonalidade de matrículas (melhores épocas pra captar aluno)** — série mensal de
   `Matricula.dataMatricula` (novas matrículas por mês).
4. **Sazonalidade de receita** — mesmo gráfico de tendência mensal já proposto para o Caixa
   (item 1 acima) — não duplicar, só reaproveitar.
5. **Alunos ativos por período** — matrículas iniciadas menos encerradas por mês
   (`dataMatricula` vs. `dataEncerramento`), pra mostrar curva de crescimento/atrito ao longo
   do tempo, em vez do número único e estático que a Home mostra hoje.

### ⚠️ Ressalvas de qualidade de dado (importantes antes de implementar)

- **`Matricula.dataMatricula` importada via CSV é a data do import, não a data real de
  matrícula** (`src/app/(protected)/pessoas/importar/actions.ts`) — fica marcada em
  `observacoes: "Data de matrícula aproximada..."`, mas se não for filtrada/sinalizada, gera
  um pico artificial de "matrículas" no dia em que alguém importou uma planilha, distorcendo
  qualquer gráfico de sazonalidade. Precisa ser tratada (filtrar ou marcar visualmente) antes
  de qualquer série temporal ir ao ar.
- **`Turma.dataInicio` não é confiável como eixo temporal multi-ano.** Só é preenchido para
  turmas Wix quando o nome do produto tem prefixo `DD/MES` (principalmente oficinas
  avulsas — cursos recorrentes ficam `null`), e quando é preenchido, o **ano é fixo** por uma
  constante do código (`ANO_PADRAO_DATA_TURMA`, hoje `2026`) porque a Wix não informa ano no
  nome do produto. Serve como rótulo ("quando essa turma rodou"), não como eixo de
  série temporal — usar `Matricula.dataMatricula` para isso, que tem datas reais (inclusive
  para matrículas retroativas do Wix, derivadas do `dataRecebimento` do pedido).

### Isso é um escopo maior — e a tensão de roadmap fica mais forte aqui

O item v3 prioridade 1 do `mini-prd.md` descreve "Dashboard financeiro" literalmente como
*"Panorama do mês, ritual de segunda, pendências. **Agrega tudo do v1/v2**"* — uma aba "Geral"
que cruza receita (Caixa) com operação (Turmas/Matrículas) numa visão agregada única é mais
próxima dessa descrição do que os cards pontuais de Caixa propostos acima. Vale o mesmo aviso
da seção "Tensão com o roadmap", só que mais forte: isso não é "um gráfico a mais numa tela
que já existe", é o primeiro rascunho do próprio item v3 do roadmap.

**Visibilidade**: como a aba mistura receita (dado financeiro, regra #6: "visível apenas para
Camila e contadora") com contagem de alunos por turma (dado mais operacional), a recomendação
é manter o mesmo gate de role do que a tab Financeiro hoje (`CAIXA_ROLES`) em vez de abrir para
todo mundo — mais simples e evita reabrir a discussão de quem vê o quê.

### O que não fazer aqui

- Não usar `Turma.mensalidadeCentavos` como "receita" — é preço de tabela, não dinheiro
  recebido; usar `Recebimento`.
- Não construir série temporal em `Turma.dataInicio` sem antes resolver o ano fixo
  (`ANO_PADRAO_DATA_TURMA`) — vira comparação ano-a-ano incorreta.
- Não misturar matrículas de import CSV não sinalizadas na sazonalidade sem filtrar/marcar.
- Nenhum campo novo no Firestore é necessário para nada disto — se em algum momento parecer
  necessário adicionar campo, é sinal de que o escopo cresceu além do que este discovery cobre.

## Ordem de implementação sugerida

Fases pequenas e testáveis, no mesmo espírito de `docs/plano-v1.md`:

1. Instalar `recharts` (ou componente `chart` do shadcn) + adicionar filtro de período ao
   histórico de recebimentos.
2. Gráfico de tendência mensal de recebido no Caixa.
3. Cards de composição (origem, forma de pagamento, turma) no Caixa.
4. Timeline de repasses a vencer.
5. **(Escopo maior, decisão à parte)** Aba "Geral" na Home: rankings de turmas (alunos e
   receita) + sazonalidade de matrículas + alunos ativos por período — só depois de resolver
   as ressalvas de qualidade de dado acima (CSV import, ano fixo em `Turma.dataInicio`).

Cada fase é independente e pode ser validada isoladamente com a Camila antes de avançar para
a próxima — mesmo padrão de checkpoints incrementais usado no v1.
