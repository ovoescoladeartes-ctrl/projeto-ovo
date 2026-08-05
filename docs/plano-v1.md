# Trilho — Plano de implementação v1

## Contexto

O Trilho é a ferramenta de gestão da escola de artes OVO, construída para dois rituais
sobre uma base compartilhada: Camila (financeiro, semanal) e Katlin (comunicação, 3x/dia).
O `docs/mini-prd.md` define o escopo do v1 e deixa claro que os dois módulos só valem a
pena se a **base compartilhada** (Pessoa, Curso/Turma, Matrícula) existir primeiro — é
uma hierarquia de camadas, não uma preferência de organização.

O projeto já não é greenfield: existe uma base funcional em
`/Users/macstudio/Apps/projeto-ovo` com auth (Firebase, cookie de sessão + custom claims),
roles (`admin|financeiro|comunicacao|educador` + `pendente`), layout protegido, sidebar
com os itens "Vagões/Pessoas/Caixa" já desenhados mas desabilitados (`href: null`), e um
dashboard **mockado** na home (KPIs agregados, funil de 6 estágios, checklist, copiloto)
construído a partir de um Figma de referência — mas esse dashboard é escopo de v2/v3
("Won't have v1" no PRD) e **não deve ser tocado agora**. O trabalho deste plano é
construir as telas reais do v1 como novas rotas (`/pessoas`, `/caixa`, `/vagoes`,
`/mensagens`), seguindo os padrões já estabelecidos no código (Server Actions com zod +
checagem de role no servidor, Firestore só via Admin SDK, shadcn/ui, mobile-first).

**Decisões já fechadas com o usuário nesta sessão** (não reabrir durante a implementação):
- Saldo vivo = confirmado − saídas pagas. Wix retido **não** entra nesse número (fica de
  fora do v1 como KPI — o cabeçalho do Caixa no v1 tem só os 3 KPIs do PRD: saldo vivo,
  recebido no mês, repasses pendentes).
- Urgência no board de Vagões conta desde a última mudança de estágio (não desde a última
  mensagem recebida).
- Cadastro inicial de Pessoas: ferramenta simples de import CSV único (não é a integração
  Wix contínua do v4).
- A home mockada em `/` fica intocada; as rotas reais do v1 são novas.

Uma branch nova (`feature/v1-implementation` a partir de `developer`, não de `main`) é
criada para esta sessão e todo trabalho subsequente é commitado/enviado nela — não na
branch `feature/ui-tweaks` atualmente ativa.

**Referência visual do board de Vagões**: a tela
[Figma "Trilho-App", node 34:2756](https://www.figma.com/design/aeNz2o6CfKYGo2DzpkclOe/Trilho-App?node-id=34-2756&m=dev)
("vagoes-comunicacao") é a referência de layout para a fase 3. Capturada via MCP do Figma
nesta sessão — ver detalhes e implicações na Fase 3 abaixo.

---

## Decisões técnicas transversais

1. **Dinheiro em centavos inteiros** (`valorCentavos: number`), nunca float. Helper novo
   `src/lib/currency.ts` (`formatCentavos`, `parseCentavosInput`).
2. **`ativo: boolean`** é o substituto universal do hard delete (regra do PRD), separado do
   **status de negócio** de cada entidade (matrícula `encerrada`, contato `arquivado`,
   repasse `pago`) — esses continuam `ativo:true` e aparecem no histórico normalmente.
3. **Sem `react-hook-form`** — seguir o padrão já existente em `RoleSelectForm.tsx`
   (`useState` + `useTransition` chamando a Server Action direto).
4. **Saldo vivo calculado ao vivo via `AggregateQuery`/`.sum()` do Admin SDK**, sem contador
   materializado — elimina risco de concorrência (não há contador para dessincronizar).
5. **Busca de Pessoa**: trazer todas as Pessoas ativas do tipo relevante (teto defensivo
   `.limit(1000)`) e filtrar por substring normalizada em memória no servidor — Firestore
   não tem full-text nativo e a escala (uma escola pequena) não justifica mais que isso.
6. **Serialização de `Timestamp`**: helper `src/core/shared/serialize.ts` (`toIso`) em todo
   mapeamento doc→DTO antes de passar de Server Component para Client Component.
7. **`firestore.rules` não muda** — continua bloqueando 100% do acesso client-side; tudo
   passa pelo Admin SDK no servidor.
8. **Padrão de arquivo por entidade** (replicando `admin/usuarios/`):
   `src/core/<entidade>/schema.ts` (zod + tipos) · `src/app/(protected)/<rota>/actions.ts`
   (`"use server"`, zod, checagem de role dentro da action, try/catch → `{status,message?}`,
   `revalidatePath`) · `src/app/(protected)/<rota>/page.tsx` (Server Component,
   `getServerSession()` + redirect se role errada — repetido mesmo já filtrado na sidebar).

**Dependências novas** (fase 0): `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
(board de Vagões — mantido ativamente, substitui o arquivado `react-beautiful-dnd`),
`csv-parse` (import, só server-side), componentes shadcn faltantes:
`dialog command popover label textarea table`.

---

## Fase 0 — Setup

- Criar branch `feature/v1-implementation` a partir de `developer` (não `main`).
- Instalar as dependências novas acima; checar peer-deps com React 19 (pnpm é estrito —
  resolver via `pnpm.overrides` se necessário, nunca `--force`).
- `src/components/shell/AppSidebar.tsx`: trocar `href: null` pelas rotas reais e restringir
  `roles` por item — Caixa: `["admin","financeiro"]`; Vagões/Mensagens:
  `["admin","comunicacao"]`; Pessoas: `["admin","comunicacao","financeiro"]` (é a entidade
  compartilhada, ambas usam). Isso é só filtro de UI — cada rota re-checa a role no servidor.
- Opcional, recomendado: configurar emuladores Firestore/Auth em `firebase.json` para não
  testar contra dados reais durante o desenvolvimento (especialmente relevante na fase 5).

## Fase 1 — Base compartilhada (Pessoa, Turma, Matrícula)

Coleções Firestore top-level: `pessoas`, `turmas`, `matriculas` (matrícula referencia
`pessoaId`/`turmaId` como campos simples, não subcoleção — evita `collectionGroup` queries
sem necessidade real na escala do produto).

- `src/core/pessoas/schema.ts` — `pessoaInputSchema` como `z.discriminatedUnion("tipo", …)`:
  `tipo:"aluno"` → `status: "lead"|"matriculado"`; `tipo:"colaborador"` →
  `status: "ativo"|"banco_talentos"`. Campo `criadoViaContatoId: string|null` (preenchido só
  pela conversão da fase 4).
- `src/core/turmas/schema.ts` — nome, `mensalidadeCentavos`, `repasseTipo:
  "percentual"|"fixo"` + `repasseValor`, `dataInicio`/`dataFim`, `educadorPessoaId` opcional.
- `src/core/matriculas/schema.ts` — `pessoaId`, `turmaId`, `dataMatricula`,
  **`mensalidadeCombinadaCentavos` como snapshot** do valor no momento da matrícula (não
  referencia `turmas.mensalidadeCentavos` dinamicamente — um reajuste de mensalidade não
  pode alterar retroativamente matrículas antigas; é uma garantia de integridade do
  histórico financeiro, vale confirmar com a Camila mas é a escolha segura por padrão).
- Rotas: `/pessoas` (lista + filtro tipo/status + form em Dialog + `[id]` detalhe com
  matrículas vinculadas), `/pessoas/turmas` (CRUD de turma — sem item de sidebar próprio,
  já que o design/Figma não previu um; vive dentro do fluxo de Pessoas).
- `src/components/PessoaCombobox.tsx` — `command`+`popover`, chama a Server Action de busca;
  reutilizado no Caixa (fase 2) e no board (fase 3).
- Índices compostos de `matriculas` (`pessoaId==,status==` e `turmaId==,status==`) só se
  materializam quando o Firestore reclamar na primeira execução real — capturar o link de
  auto-criação nesse momento, não adivinhar antecipadamente.

### Checkpoints incrementais (testar em localhost a cada um)

- **1.1** Schema Pessoa + action `criarPessoa`/`listarPessoas` + rota `/pessoas` (lista +
  Dialog de criação, tipos aluno/colaborador, sem tela de detalhe ainda).
  ✅ testar: criar pessoa aluno e colaborador com status certo por tipo, ver na lista,
  inativar (some da lista).
- **1.2** Rota `/pessoas/[id]` — detalhe básico (editar, inativar), ainda sem matrículas.
  ✅ testar: abrir detalhe, editar campo, inativar pela própria tela.
- **1.3** Schema Turma + rota `/pessoas/turmas` (CRUD).
  ✅ testar: criar turma com repasse percentual e com repasse fixo, editar, inativar.
- **1.4** `PessoaCombobox.tsx` isolado (usado no fluxo de matrícula abaixo).
  ✅ testar: buscar pessoa por substring, resultado normalizado.
- **1.5** Schema Matrícula + fluxo de matricular (a partir do detalhe da Pessoa) + lista de
  matrículas vinculadas na tela de detalhe.
  ✅ testar: matricular · mudar mensalidade da turma e confirmar que matrícula antiga
  mantém o valor combinado original · encerrar matrícula (some de "ativas", aparece em
  histórico).
- **1.6** Guarda de role explícita em `/pessoas` e `/pessoas/turmas`.
  ✅ testar: logar como `educador`, confirmar bloqueio nas duas rotas.

**Teste manual (fase completa)**: criar pessoa aluno/colaborador com os status certos por
tipo · inativar uma pessoa (some da lista, doc permanece com `ativo:false`) · criar turma
com repasse percentual e fixo · matricular, depois mudar mensalidade da turma → matrícula
antiga mantém valor combinado original · encerrar matrícula (some de "ativas", aparece em
histórico) · logar como `educador` e confirmar bloqueio em `/pessoas` pela própria página.

## Fase 2 — Financeiro (Caixa)

- `src/core/financeiro/recebimentos/schema.ts` — pessoa/turma/matrícula (FKs opcionais
  exceto pessoa), `valorCentavos`, `formaPagamento`, `origem:"wix"|"manual"`,
  `status:"confirmado"|"pendente"|"cancelado"`, `dataRecebimento`.
- `src/core/financeiro/repasses/schema.ts` — `destinoTipo:"educador"|"espaco"|"outro"`
  (`destinoPessoaId` obrigatório via `.refine` quando `educador`), `turmaId` (o "papel/turma"
  do PRD), `valorCentavos`, `vencimento`, `status:"pendente"|"pago"`, `origem`.
- `src/core/financeiro/saldo.ts` — `calcularSaldoVivo`, `calcularRecebidoNoMes`,
  `contarRepassesPendentes`, todos via `AggregateQuery.sum()`, sem contador materializado.
  **Comentário explícito no código**: só `recebimentos.status==="confirmado"` entra no
  saldo vivo — não construir um 4º KPI "a liberar do Wix" que não está no must-have do v1,
  mesmo que o dashboard mock antigo mostre um.
- Rota `/caixa`: cabeçalho com os 3 KPIs (reaproveitando `src/components/dashboard/KpiCard.tsx`,
  que já é genérico o bastante — `{label,value,subtitle}` — sem tocar em `mockData.ts` ou
  lógica de dashboard agregado), Tabs (Recebimentos | Repasses), forms em Dialog usando
  `PessoaCombobox`, histórico navegável com filtro por origem/status.
- Restrição de role: `session.role === "admin" || session.role === "financeiro"`, replicando
  literalmente o padrão de `admin/usuarios/page.tsx`.
- "Marcar repasse como pago" deve checar dentro da própria action se já está `"pago"` antes
  de gravar (idempotência contra duplo clique — sem precisar de transação Firestore aqui).

### Checkpoints incrementais (testar em localhost a cada um)

- **2.1** Schema recebimentos + rota `/caixa` aba Recebimentos (form em Dialog usando
  `PessoaCombobox` + lista, sem KPIs no cabeçalho ainda).
  ✅ testar: registrar recebimento confirmado e pendente, ver ambos na lista.
- **2.2** Schema repasses + aba Repasses (form + lista).
  ✅ testar: registrar repasse (educador/espaço/outro), ver na lista.
- **2.3** `saldo.ts` + os 3 KPIs no cabeçalho (`KpiCard.tsx` reaproveitado).
  ✅ testar: saldo vivo sobe com recebimento confirmado · recebimento pendente não mexe
  no saldo · repasse pendente aparece no KPI de "repasses pendentes" sem afetar saldo.
- **2.4** Ação "marcar repasse como pago" com checagem de idempotência.
  ✅ testar: marcar como pago desce o saldo vivo · duplo clique não desconta em dobro.
- **2.5** Restrição de role em `/caixa` + filtro por origem/status no histórico.
  ✅ testar: login `comunicacao` bloqueado pela própria rota · filtro funciona com >20
  registros.

**Teste manual (fase completa)**: recebimento confirmado sobe o saldo · recebimento
pendente não mexe no saldo · repasse pendente aparece no KPI mas não afeta saldo · marcar
pago desce o saldo · duplo clique em "marcar como pago" não desconta em dobro · login
`comunicacao` bloqueado em `/caixa` pela própria rota · histórico com filtro por origem
funciona com >20 registros.

## Fase 3 — Comunicação (Novo Contato + Vagões + Biblioteca de Mensagens)

### Referência visual (Figma node 34:2756, "vagoes-comunicacao")

Capturado nesta sessão via MCP do Figma (screenshot + metadata). Pontos que mudam/afinam o
que estava assumido antes de ver a tela real:

- **Layout desktop é de 6 colunas lado a lado**: Lead novo, Em conversa, Experimental,
  Matriculado, Ex-aluno, Não convertido — confirma a leitura de `docs/design.md`: os 5
  estágios do PRD continuam a fonte de verdade do dado (`estagio` + `arquivadoMotivo`), mas
  a **exibição** desktop separa `arquivado` em duas colunas visuais por `arquivadoMotivo`
  (ex_aluno / nao_convertido) lado a lado com as 4 colunas ativas, em vez de uma única
  coluna "arquivado". A função de agrupamento do board deve baldear por
  `(estagio, arquivadoMotivo)`, não só por `estagio`.
- **Card**: avatar com iniciais + nome + linha secundária "`{turma/interesse} · Xd`" (ex:
  "Aquarela · 1d"). Badge numérico preto no cabeçalho de cada coluna com a contagem de
  cards. **Nenhuma cor de urgência aparece no mock** (cards de 1d e de 10d têm exatamente o
  mesmo estilo neutro) — a codificação por cor exigida pelo PRD ("destacados por cor") não
  está no Figma e precisa ser desenhada por cima deste layout base, não copiada dele.
- **Cabeçalho da tela** tem um campo "Pergunte algo sobre a escola..." — é o mesmo Copiloto
  desabilitado que já existe no dashboard mock (`CopilotoInput.tsx`). Copiloto é
  explicitamente Won't-have v1: reaproveitar o componente já existente **desabilitado**,
  só por consistência visual, sem nenhuma lógica nova por trás.
- **Tabs "Comunicação" / "Financeiro"** no topo — "Financeiro" aqui é o Vagões financeiro
  (pipeline do dinheiro), que é Won't-have v1 explícito no PRD. A rota `/vagoes` do v1
  implementa só o conteúdo da aba Comunicação; a aba Financeiro fica omitida ou desabilitada
  (mesmo padrão do restante da sidebar), nunca funcional nesta fase.
- **Filtro "curso: todos"** no canto superior direito — filtro por turma no board. Não é
  must-have do v1 (é irmão do "Filtro por turma no Caixa", que é should-have), mas como o
  Figma já reserva o espaço, vale implementar se a fase 3 não atrasar por causa disso —
  mesmo critério de should-have do PRD.
- **Campo de "turma/interesse" no card** não tem equivalente direto no fluxo Must-have de
  Novo Contato (que é só nome/canal/o que perguntou, 3 campos, PRD é explícito que isso é
  "desacoplado da resposta" e deve ficar simples). Não inventar um 4º campo obrigatório no
  form de criação para bater com o Figma — usar o texto livre de `interesseInicial`
  (truncado) como a linha secundária do card no v1. Se depois for necessário um campo
  estruturado de "turma de interesse", isso é uma decisão de produto a validar com a
  Katlin, não algo a assumir da leitura do Figma sozinha.

### Schema

- `src/core/comunicacao/contatos/schema.ts` — `estagio:"novo"|"em_conversa"|"experimental"|
  "convertido"|"arquivado"`, `arquivadoMotivo:"ex_aluno"|"nao_convertido"|null`,
  `pessoaId: string|null`, e **`estagioAtualizadoEm`** como campo crítico — é a partir dele
  que a urgência é calculada (nunca de "última mensagem", decisão já fechada).
- `src/core/comunicacao/mensagens/schema.ts` — `categoria:"duracao"|"valor"|"nivel"|
  "faixa_etaria"` (enum fixo no v1; configurável é v2+), `titulo`, `texto`.
- `src/core/comunicacao/urgencia.ts` — função pura `calcularUrgencia(estagioAtualizadoEm,
  agora)`; os limiares exatos de cor (ex: <24h/24-72h/>72h) precisam de validação com a
  Katlin antes de fechar a fase, mas a regra "conta desde mudança de status" já está
  decidida.
- **Ordenação do board**: uma única query
  `contatos.where("ativo","==",true).orderBy("estagioAtualizadoEm","asc")`, agrupada em
  memória nos **6 baldes visuais** `(estagio, arquivadoMotivo)` do Figma (novo, em_conversa,
  experimental, convertido, arquivado+ex_aluno, arquivado+nao_convertido) — em vez de 6
  queries separadas. Exige só **um** índice composto `(ativo ASC, estagioAtualizadoEm ASC)`
  em `firestore.indexes.json`.
- Rotas: `/vagoes` (Board client com `@dnd-kit`, 6 colunas no desktop conforme o Figma,
  `NovoContatoDialog` com os 3 campos do PRD, `MensagemPickerSheet` com tabs por categoria +
  copiar via clipboard API) e `/mensagens` (CRUD da Biblioteca).
- **Mobile-first obrigatório** (Katlin usa ~90% do tempo no celular, `docs/design.md`): o
  Figma é desktop-only, então o comportamento mobile é inferido, não extraído dele — abaixo
  do breakpoint `md`, uma coluna por vez (seletor de estágio) com cards empilhados e botão
  "mover para →" como **caminho primário** de mudança de estágio; o drag fica como
  capability desktop. Os dois caminhos (drag e ação direta) precisam existir sempre, isso é
  requisito do PRD, não opcional.
- `useOptimistic` (React 19) no `Board.tsx` para mover o card visualmente antes da Server
  Action confirmar.

### Checkpoints incrementais (testar em localhost a cada um)

- **3.1** Schema contatos + `NovoContatoDialog` + rota `/vagoes` como lista simples
  agrupada por estágio (sem board visual em colunas nem drag ainda).
  ✅ testar: criar contato com os 3 campos, cai em "novo".
- **3.2** Board visual desktop: 6 colunas conforme o Figma, agrupamento em memória por
  `(estagio, arquivadoMotivo)`, ainda só exibição (sem drag).
  ✅ testar: contatos aparecem na coluna certa, badge numérico de contagem bate.
- **3.3** Drag and drop desktop (`@dnd-kit`) + `useOptimistic` no `Board.tsx`.
  ✅ testar: arrastar card muda de coluna, persiste depois do reload.
- **3.4** Mobile: seletor de estágio (uma coluna por vez) + botão "mover para →" como
  caminho primário.
  ✅ testar: no mobile, mover via botão chega ao mesmo resultado do drag desktop.
- **3.5** `urgencia.ts` + codificação por cor nos cards (limiares provisórios, a validar
  com a Katlin).
  ✅ testar: card muda de cor conforme o tempo desde a última mudança de estágio.
- **3.6** Schema mensagens + rota `/mensagens` (CRUD da Biblioteca, standalone).
  ✅ testar: criar/editar/remover mensagem por categoria.
- **3.7** `MensagemPickerSheet` integrado ao card do board (copiar via clipboard API).
  ✅ testar: abrir picker a partir de um card, copiar mensagem, tabs por categoria.
- **3.8** Filtro "curso: todos" no board (should-have — só se não atrasar a fase).
  ✅ testar: filtrar por turma reduz os cards exibidos nas 6 colunas.
- **3.9** Restrição de role em `/vagoes` e `/mensagens`.
  ✅ testar: login `financeiro` bloqueado nas duas rotas.

**Teste manual (fase completa)**: criar contato com os 3 campos → cai em "novo" · card mais
antigo sobe e muda de cor conforme o tempo passa desde a mudança de estágio · mover via
drag (desktop) e via botão (mobile) chegam ao mesmo resultado · Biblioteca abre a partir do
card, copiar funciona · CRUD de mensagem reflete no picker · login `financeiro` bloqueado
em `/vagoes` e `/mensagens`.

## Fase 4 — Ponto de encontro (conversão contato → pessoa)

Única costura real entre os módulos, e o único ponto do produto com requisito de
atomicidade forte — se o contato virar "convertido" sem a Pessoa ser criada (ou
vice-versa), a promessa central ("Camila não recadastra nada") quebra silenciosamente.

- `converterContatoEmPessoa(contatoId)` em `src/app/(protected)/vagoes/actions.ts`, dentro
  de `getFirebaseAdminFirestore().runTransaction()`: lê o contato, valida
  `estagio !== "convertido" && pessoaId === null` (idempotência contra clique duplo), cria
  a Pessoa (`tipo:"aluno", status:"matriculado", criadoViaContatoId`), atualiza o contato
  (`estagio:"convertido", pessoaId, estagioAtualizadoEm`). Falha em qualquer passo reverte
  tudo — nunca fica "meio convertido".
- `moverEstagioContato` passa a delegar para essa função especificamente quando o destino é
  `"convertido"`, chamada tanto pelo drag quanto pela ação direta — mesma garantia
  transacional nos dois caminhos.
- Nenhuma mudança necessária no Caixa: `PessoaCombobox` (fase 1) já busca qualquer Pessoa
  ativa tipo `aluno`, então a Pessoa recém-criada aparece naturalmente quando a Camila
  registrar o primeiro recebimento.
- Decisão a fechar durante a implementação (não é óbvia no PRD): mover um contato já
  convertido de volta para outro estágio é permitido, mas `pessoaId` nunca é apagado —
  fica como rastro histórico do vínculo já estabelecido.

### Checkpoint incremental (fase é um único passo testável)

- **4.1** `converterContatoEmPessoa` transacional, chamada tanto pelo drag quanto pelo botão
  de mover-para-convertido.
  ✅ testar: converter → Pessoa aparece em `/pessoas` com os campos certos · buscar essa
  Pessoa no Caixa sem recadastro · duplo clique na conversão não cria 2 Pessoas.

**Teste manual (fase completa)**: converter contato → Pessoa aparece em `/pessoas` com os
campos certos · buscar essa Pessoa no Caixa sem recadastro · duplo clique na conversão não
cria 2 Pessoas · falha simulada no meio da transação não deixa estado parcial.

## Fase 5 — Import CSV (carga inicial de Pessoas)

- `src/app/(protected)/pessoas/importar/` — restrito a `role==="admin"`. Colunas: nome,
  tipo, turma, status. **Modo dry-run por padrão**: primeira chamada só retorna prévia +
  erros por linha; `confirmar=true` grava de fato (batches de até 400, limite do
  `WriteBatch` é 500).
- Turma é resolvida por nome contra `turmas` já cadastradas — o import **nunca cria turma
  automaticamente** (evita turma "fantasma" por erro de digitação); pré-requisito
  operacional é cadastrar as turmas via `/pessoas/turmas` (fase 1) antes de importar.
- Sem identificador único no CSV além do nome — nomes duplicados não são bloqueados
  automaticamente, mas listados como "possível duplicata" na prévia para revisão humana.
- Sem `dataMatricula` real na origem — usa a data do import e registra em `observacoes`
  que é uma aproximação, para não fingir precisão que o dado não tem.

### Checkpoints incrementais (testar em localhost a cada um)

- **5.1** Rota `/pessoas/importar` — preview dry-run (parse CSV, valida linhas, erros
  nomeados, aponta possíveis duplicatas por nome), sem gravar nada ainda.
  ✅ testar: subir CSV válido e um com linha de turma inexistente, ver prévia + erro
  nomeado, confirmar que nada foi gravado no Firestore.
- **5.2** `confirmar=true` grava de fato (batches de até 400) + reimport aponta duplicatas.
  ✅ testar: confirmar grava as ~80 Pessoas+matrículas · rodar o mesmo CSV de novo aponta
  duplicatas em vez de duplicar silenciosamente · roles não-admin bloqueadas na rota.

**Teste manual (fase completa)**: preview com CSV válido não grava nada · confirmar grava
as ~80 Pessoas+matrículas · linha com turma inexistente vira erro nomeado, resto importa
normal · rodar o mesmo CSV de novo aponta duplicatas em vez de duplicar silenciosamente ·
roles não-admin bloqueadas na rota.

---

## Ordem de execução

Base → Financeiro → Comunicação → Ponto de encontro → Import, na ordem do PRD. Nuance
prática: testar as fases 2 e 3 não precisa esperar a fase 5 — o CRUD manual de
Pessoa/Turma da fase 1 já basta para popular dados de teste. O import da fase 5 é sobre a
carga real de produção (~80 alunos), não um bloqueio técnico das fases intermediárias.

Cada fase acima está quebrada em **checkpoints incrementais** (1.1, 1.2, …) — cada um
termina numa tela ou fluxo já testável em `localhost`, não só no "Teste manual" da fase
inteira. A ideia é rodar `pnpm dev` e validar no navegador a cada checkpoint fechado, em vez
de acumular várias features antes do primeiro teste real.

## Arquivos-chave de referência (padrões a seguir, não recriar)

- [admin/usuarios/actions.ts](../src/app/(protected)/admin/usuarios/actions.ts) — padrão obrigatório de toda Server Action nova
- [getServerSession.ts](../src/core/auth/getServerSession.ts) — checagem de role em profundidade em toda rota
- [AppSidebar.tsx](../src/components/shell/AppSidebar.tsx) — hrefs e roles por item de nav
- [firebaseAdmin.ts](../src/core/firebase/firebaseAdmin.ts) — único ponto de acesso a Firestore/Auth
- [firestore.indexes.json](../firestore.indexes.json) — recebe os índices compostos conforme forem exigidos pelas queries reais
