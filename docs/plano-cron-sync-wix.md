# Plano: sincronização automática Wix → Firestore (cron horário, sem disparo manual)

Este documento é um **plano de implementação**, ainda não executado. Nenhum código foi alterado a partir dele.

## Contexto

Hoje a sincronização Wix → Firestore (`Pessoas`/`Turmas`/`Recebimentos`/`Matrículas`, ver [[project-projeto-ovo-wix-integration]] e [docs/discovery-integracao-wix.md](discovery-integracao-wix.md)) é **100% manual**: um admin entra em `/admin/wix-sync`, clica em "Buscar prévia" (`previewSincronizacaoWix`), revisa os números e clica em "Confirmar sincronização" (`confirmarSincronizacaoWix`) — ambos em [src/app/(protected)/admin/wix-sync/actions.ts](../src/app/(protected)/admin/wix-sync/actions.ts).

**Decisões desta revisão:**
1. O fluxo manual de disparo é **abandonado**, não só complementado — na prática ninguém vai lembrar de abrir essa tela regularmente. O cron passa a ser a **única forma de disparar** a sincronização em produção; a tela deixa de ter botão de ação e vira uma visão **somente leitura** do histórico de execuções.
2. Hospedagem de produção confirmada como **Vercel**, mas o plano é **Hobby (gratuito)** — Vercel Cron no Hobby é limitado a 1 execução/dia, incompatível com o retry horário desejado (ver seção de retry). O agendador passa a ser um **serviço externo gratuito** (ex. [cron-job.org](https://cron-job.org)) chamando o endpoint `/api/cron/wix-sync` de hora em hora via HTTP GET com o header `Authorization: Bearer $CRON_SECRET`. Sem `vercel.json` — nada a configurar no lado da Vercel além das env vars.
3. Erro silencioso na integração **não é aceitável nem temporariamente** — em vez de virar um item de v2, retry automático e alerta por e-mail entram nesta mesma implementação (v1).
4. Como não dá para estimar com segurança o volume futuro de dados, o desenho evita que o custo de Firestore cresça com o tamanho histórico da base — em vez de confiar numa estimativa atual do plano gratuito (Spark).
5. **A tela de histórico sai de `/admin/wix-sync` e vira `/wix-sync`, listada dentro do grupo "Configurações" na sidebar.** Conferido em [navItems.ts](../src/components/shell/navItems.ts): hoje `/admin/wix-sync` (e `/admin/usuarios`) não estão linkados em nenhum lugar da navegação — são URLs que só quem sabe o caminho acessa. Isso não muda com o repurpose pra tela de leitura: sem link na sidebar, continuaria invisível. O grupo "Configurações" já existe (`navItems.ts:38-44`, hoje só com "Mensagens" → `/mensagens`) e segue o padrão de URLs top-level (não há prefixo `/configuracoes/*` em lugar nenhum do projeto — o agrupamento é só visual, na sidebar). A nova rota segue o mesmo padrão: `src/app/(protected)/wix-sync/` (fora de `admin/`), listada como filha de "Configurações". `/admin/usuarios` fica como está — fora de escopo desta mudança.

## O que já é reaproveitável (baixo risco)

- `confirmarSincronizacaoWix()` (hoje em [actions.ts:240-478](../src/app/(protected)/admin/wix-sync/actions.ts)) já é **idempotente** — upsert por `wixContactId`/`wixProductId`/`wixOrderId`+`wixLineItemId`, seguro rodar de novo.
- Paginação/cursor já implementados em [orders.ts](../src/core/wix/orders.ts), [contacts.ts](../src/core/wix/contacts.ts) e [products.ts](../src/core/wix/products.ts) — não é risco novo do cron.
- [client.ts](../src/core/wix/client.ts) (`wixFetch`) é somente leitura por convenção do módulo — regra de produto "Trilho registra e reflete; nunca executa a ação externa" — cron não muda essa garantia.
- [firebaseAdmin.ts:13-17](../src/core/firebase/firebaseAdmin.ts) (`getOrCreateFirebaseAdminApp`) já faz lazy-init com `getApps()[0]` — funciona tanto dentro do Next.js quanto rodando via `tsx` num script, sem precisar duplicar a inicialização do Firebase Admin.
- `firestore.rules` é um único `allow read, write: if false` para tudo (default-deny), sem regra por coleção — uma coleção nova de log não exige nenhuma mudança em `firestore.rules`.

## Estratégia de segurança para a cota do Firestore (plano Spark/gratuito)

O plano Spark não cobra por excedente — tem cotas diárias fixas (50 mil leituras / 20 mil escritas / 20 mil exclusões no Firestore); ao estourar, requisições extras falham até resetar à meia-noite (horário do Pacífico). O risco real não é financeiro, é **indisponibilidade compartilhada**: se o cron consumir a cota do dia, o resto do app (equipe usando o dashboard) também pode começar a falhar.

Hoje `carregarExistentes()` lê as coleções inteiras de `pessoas`/`turmas`/`recebimentos`/`matriculas` a cada execução, e `searchApprovedOrders()` sempre re-busca o histórico completo de orders da Wix (comentário em [orders.ts:10-13](../src/core/wix/orders.ts): "v1 sempre refaz o histórico completo"). Pelos números do primeiro sync (memória: 55 Pessoas/16 Turmas/127 Recebimentos em 2026-08-12), isso hoje é barato (~200-400 leituras/execução) — mas como não dá para garantir o volume futuro, o desenho evita que o custo cresça com o tamanho histórico da base:

1. **Busca incremental no dia a dia**: `buscarDadosWix()` passa a aceitar um cursor `desde` (data da última execução **com sucesso**, lida do próprio `logsSincronizacaoWix` — busca o doc mais recente com `status: "ok"`). `searchApprovedOrders(desde?: string)` adiciona `createdDate: { $gte: desde }` ao filtro da Wix quando houver cursor — **validar durante a implementação** se a API de Search Orders da Wix aceita esse operador nesse campo (padrão usual das APIs de query/search da Wix, mas não confirmado contra a doc). Sem cursor (primeira execução, ou fallback), busca tudo, igual a hoje.
2. **Lookups no Firestore ficam proporcionais ao lote do dia, não ao histórico total**: nova `carregarExistentesRelevantes(orders, products)` substitui `carregarExistentes()` no caminho incremental — em vez de `.get()` na coleção inteira, monta os conjuntos de `wixContactId`/`wixOrderId`/`pessoaId` **só dos itens que aparecem no lote** e consulta via `.where(campo, "in", chunk)` em lotes de até 30 (limite do operador `in` do Firestore). `turmas` continua com leitura completa mesmo no caminho incremental — o catálogo de cursos é pequeno e não cresce com o histórico de transações.
3. **Reconciliação completa semanal (domingo, uma única vez)**: a mesma rota decide internamente o modo. Regra: `completo` quando for domingo (UTC) **e** ainda não existir nenhum log com `status: "ok"` e `modo: "completo"` datado de hoje; senão `incremental`. Existe porque a atualização de nome/e-mail/telefone de uma Pessoa (`planoPessoas.atualizar`) só é reavaliada quando a Wix Contact daquele comprador é re-buscada — no modo incremental isso só acontece pra quem fez pedido recente. A reconciliação semanal garante que uma mudança de cadastro de quem não comprou de novo ainda seja capturada, com no máximo 6 dias de atraso.
4. **Limite de segurança (circuit breaker)**: antes de gravar qualquer coisa, se `orders.length` (do lote buscado) passar de um teto configurável (ex. `LIMITE_SEGURANCA_ORDERS = 2000`), a execução aborta sem escrever nada, grava um log com `status: "error"` e mensagem explícita, e não avança o cursor. Protege contra um bug (ex. o filtro `desde` falhar silenciosamente e voltar a trazer tudo) que faria o cron consumir a cota sem ninguém perceber.
5. **Monitoramento**: checar a aba de uso do Firestore no console do Firebase nas primeiras semanas, e depois da primeira reconciliação completa de domingo (pico de leitura da semana).

Efeito prático: o custo do cron passa a ser proporcional a "quantos pedidos novos a Ovo recebeu" (tipicamente pequeno e estável) em vez de "quantos documentos existem no total desde o início" (que só cresce).

## Retry automático + alerta por e-mail (v1, não adiado)

Sem botão manual, uma falha silenciosa poderia passar despercebida por dias. Em vez de uma fila de verdade (exigiria infra nova tipo Cloud Tasks/Upstash — desproporcional pro tamanho do projeto), isso é resolvido com o que o desenho incremental já dá de graça:

### Retry: aumentar a frequência do cron, não construir uma fila

- O serviço de cron externo (ex. cron-job.org) chama a rota **de hora em hora** em vez de 1x/dia — contorna o limite do Vercel Cron no plano Hobby (1 execução/dia). Funciona porque o cursor `desde` só avança **quando a execução termina com sucesso** — uma falha não avança nada, e a próxima chamada (1h depois) tenta de novo a partir do mesmo ponto. Isso *é* o retry-até-dar-certo, só que "empurrado" pelo agendador externo em vez de um loop dentro da própria requisição serverless.
- Custo extra: a maioria das execuções horárias não vai ter pedido novo — pagam só a leitura do log mais recente pra descobrir o cursor + a chamada à Wix, poucas leituras de Firestore. Rodando 24x/dia isso ainda fica muito abaixo da cota diária.
- **Checar durante a implementação**: confirmar que o serviço externo escolhido oferece granularidade horária no plano gratuito e suporta enviar header customizado (`Authorization: Bearer $CRON_SECRET`) — nem todo serviço de cron gratuito permite headers. cron-job.org permite; validar antes de decidir por outro.

### Alerta por e-mail: Resend, só na transição para erro

- Nova dependência `resend` (SDK oficial) + env vars `RESEND_API_KEY` (nova conta a criar) e `EMAIL_ALERTA_ADMIN` (e-mail da Mari Carvalho — preencher com o endereço real).
- **Confirmado gratuito**: plano free do Resend cobre 100 e-mails/dia e 3.000/mês, sem cartão de crédito — como o alerta só dispara na transição ok→error (evento raro), fica muito abaixo do limite.
- **Verificação de domínio (grátis, mas é passo manual obrigatório)**: sem verificar um domínio próprio no Resend, a conta free só permite enviar para o e-mail de quem criou a chave — não para um destinatário arbitrário como `EMAIL_ALERTA_ADMIN` (e-mail da Mari Carvalho). Precisa verificar um domínio da Ovo (adicionar registros DNS no provedor do domínio) antes do alerta funcionar em produção; sem isso, o try/catch isolado (ver abaixo) evita que o app quebre, mas o e-mail simplesmente não chega.
- Novo helper `src/core/comunicacao/alertaSincronizacaoWix.ts` (`"server-only"`), função `enviarAlertaFalhaSincronizacaoWix(resultado)`, chamada por `executarSincronizacaoWix()` sempre que `status: "error"` (inclusive abort do circuit breaker).
- **Evitar spam em falha persistente**: antes de enviar, consulta o log anterior mais recente (não o que está gravando agora); só dispara e-mail se esse log anterior **não** tinha `status: "error"` — alerta na transição ok→error, não a cada tentativa horária enquanto o problema persiste.
- Conteúdo simples, texto plano: horário, modo, mensagem de erro, link pra `/wix-sync`. Não usa `src/core/comunicacao/contatos/` (isso é pra comunicação com aluno/família, finalidade diferente).
- Falha ao enviar o e-mail (Resend fora do ar, etc.) **não pode** derrubar a sincronização nem impedir o log — try/catch isolado, log de erro separado, sem propagar.

## O que precisa mudar

### 1. Extrair lógica de negócio para `src/core/wix/executarSincronizacao.ts` (novo arquivo)

Mover para cá, sem mudar o comportamento de escrita, tudo que hoje está em `actions.ts`: `mensagemErroWix`, `buscarDadosWix`, `calcularDataMaisAntigaPorContactId`, `ExistentesWix`, `carregarExistentes`, `Operacao`, `commitEmLotes`, `sincronizarContatoConvertido` (linhas 39-238), e o corpo de `confirmarSincronizacaoWix` (linhas 240-478) **menos** a checagem de sessão (241-244) e **menos** os `revalidatePath` (465-468) — `revalidatePath` só funciona dentro de um request handler do Next.js; move para a route handler do cron. `"server-only"` no topo do novo arquivo. [sync.ts](../src/core/wix/sync.ts) (as quatro funções `planejar*`) fica intocado — continua puro, sem I/O.

Mudanças de comportamento (não são só cópia):

- **Modo incremental vs. completo**: decidido internamente por `executarSincronizacaoWix(origem)` — lê o log mais recente com `status: "ok"` pra obter o cursor `desde` e decide o modo (ver seção de cota acima). Logo após buscar os orders, checa o circuit breaker antes de montar qualquer plano ou escrever.
- **Capturar `avisos`/`pulados`, hoje descartados**: `planejarRecebimentos` já retorna `pulados` e `avisos`, mas `confirmarSincronizacaoWix` só lê `.criar`. A nova função precisa agregar os dois (mesmo agrupamento por motivo que `previewSincronizacaoWix` já faz hoje em `actions.ts:170-173`) e devolvê-los no resultado.
- **Toda execução grava um log, sucesso ou erro** — inclusive os dois caminhos de erro que hoje só retornam mensagem (falha ao buscar da Wix, falha no meio do commit em lote). É o que torna a tela de histórico confiável.
- **Alerta de e-mail na transição pra erro** (ver seção acima), chamado a partir daqui.

```ts
export interface SincronizacaoWixPuladoResumo { motivo: string; quantidade: number }
export type SincronizacaoWixOrigem = "cron" | "script-manual";
export type SincronizacaoWixModo = "completo" | "incremental";

export interface SincronizacaoWixResultado {
  status: "ok" | "error";
  modo: SincronizacaoWixModo;
  message?: string;
  ordersProcessados?: number;
  pessoasCriadas?: number;
  pessoasAtualizadas?: number;
  turmasCriadas?: number;
  turmasAtualizadas?: number;
  recebimentosCriados?: number;
  recebimentosAvisos?: number;
  recebimentosPulados?: SincronizacaoWixPuladoResumo[];
  matriculasCriadas?: number;
}

export async function executarSincronizacaoWix(
  origem: SincronizacaoWixOrigem,
): Promise<SincronizacaoWixResultado>
```

`previewSincronizacaoWix` **não** é movida — é removida (seção 2). Sua lógica de dry-run continua só em `scripts/wix-sync-preview.ts` (seção 5), que já é independente.

### 2. `actions.ts` — deletado por completo

Depois da extração nada sobra de útil: `previewSincronizacaoWix`, `confirmarSincronizacaoWix`, `PreviewWixResult`, `ConfirmWixResult` (substituído por `SincronizacaoWixResultado`). A nova tela (seção 4) só lê Firestore, não precisa de Server Action.

### 3. Novo endpoint: `src/app/api/cron/wix-sync/route.ts`

```ts
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { executarSincronizacaoWix } from "@/core/wix/executarSincronizacao";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const secretEsperado = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secretEsperado || authHeader !== `Bearer ${secretEsperado}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const resultado = await executarSincronizacaoWix("cron");

  if (resultado.status === "error") {
    console.error("[cron/wix-sync] falhou:", resultado.message);
    return NextResponse.json(resultado, { status: 500 });
  }

  revalidatePath("/pessoas");
  revalidatePath("/pessoas/turmas");
  revalidatePath("/caixa");
  revalidatePath("/vagoes");
  return NextResponse.json(resultado, { status: 200 });
}
```

Método `GET` porque é o que o serviço de cron externo escolhido dispara (ver seção 8) — o header `Authorization: Bearer $CRON_SECRET` é configurado manualmente no painel do serviço, não injetado automaticamente como seria com Vercel Cron. `dynamic = "force-dynamic"` evita cache/prerender da rota. GET com efeito colateral foge da convenção HTTP, mas é aceitável por estar atrás do secret — mesmo padrão que a própria Vercel documenta para cron.

### 4. Mover `/admin/wix-sync` → `/wix-sync` e transformar em tela de histórico, somente leitura

- **Mover a pasta inteira** `src/app/(protected)/admin/wix-sync/` → `src/app/(protected)/wix-sync/` (fora de `admin/`, sibling de `mensagens/`) — `git mv`, sem quebrar imports internos (usam alias `@/...` ou relativos dentro da própria pasta).
- **Deletar** `WixSyncPanel.tsx` (botões "Buscar prévia"/"Confirmar").
- **Criar** `WixSyncHistorico.tsx` — componente de apresentação puro (sem `useState`/`useTransition`, não precisa `"use client"`), renderiza timestamp, origem, modo, status, contagens e `recebimentosPulados`/avisos por linha histórica — mesmos blocos visuais que `WixSyncPanel.tsx` já tem hoje (linhas 63-105), repetidos por linha.
- **Reescrever** `page.tsx`: manter a checagem de sessão admin **idêntica** (`getServerSession()`, redirect pra `/` se não for admin), corpo novo lendo `logsSincronizacaoWix` via Admin SDK:

```ts
export const dynamic = "force-dynamic";
const LIMITE_HISTORICO = 20;

// ... session gate igual ao de hoje ...

const firestore = getFirebaseAdminFirestore();
const snapshot = await firestore
  .collection("logsSincronizacaoWix")
  .orderBy("executadoEm", "desc")
  .limit(LIMITE_HISTORICO)
  .get();
```

Mesmo padrão de Server Component + Admin SDK + `toIso()` ([serialize.ts](../src/core/shared/serialize.ts)) já usado em `caixa/page.tsx`. `orderBy` de campo único não exige índice composto. Texto de apoio: *"A sincronização roda automaticamente. Esta tela é só histórico — não existe mais botão de disparo manual aqui."*

- **Adicionar à sidebar** ([navItems.ts](../src/components/shell/navItems.ts)): novo child `{ label: "Sincronização Wix", href: "/wix-sync" }` dentro do item `"Configurações"` (linha 38-44 hoje). Problema a resolver: o grupo "Configurações" tem `roles: ["admin", "comunicacao"]`, mas a página em si é admin-only — sem ajuste, um usuário `comunicacao` veria o link na sidebar e cairia num redirect ao clicar. `NavChild` hoje ([navItems.ts:5-8](../src/components/shell/navItems.ts)) não tem campo de roles próprio, só o item pai. Adicionar `roles?: readonly Role[]` opcional em `NavChild`, com fallback pras roles do item pai quando ausente (mantém "Mensagens" com o comportamento de hoje, visível pros dois papéis). `AppSidebar.tsx:117-142` e `MobileNavSheet.tsx:75-96` hoje filtram só o nível do item pai (`NAV_ITEMS.filter(item => item.roles.includes(role))`) — os children não passam por filtro nenhum. Adicionar um helper exportado em `navItems.ts` (ex. `childrenVisiveisParaRole(children, role)`) e usá-lo nos dois componentes, em vez de duplicar a lógica de filtro — seguindo o comentário já existente no arquivo ("nunca duplique esta lista"). Resultado: `{ label: "Sincronização Wix", href: "/wix-sync", roles: ["admin"] }`, só aparece pra admin; "Mensagens" continua sem `roles` no child, visível pros dois.

### 5. Scripts de terminal — consolidar em vez de triplicar lógica

- **`scripts/wix-sync-confirm.ts`**: hoje reimplementa fetch da Wix e escrita no Firestore por conta própria. Trocar o corpo inteiro por uma chamada a `executarSincronizacaoWix("script-manual")` (sempre em modo completo). **Checar durante a implementação** se importar `executarSincronizacao.ts` (que carrega `"server-only"` via `client.ts`/`env.ts`) funciona sob `tsx` puro — essa trava é do bundler do Next.js, não deveria afetar execução Node direta, mas é o motivo provável de os scripts atuais reimplementarem tudo. Se quebrar, manter a duplicação do fetch mas reaproveitar as funções de `sync.ts`. Não precisa inicializar o Firebase Admin manualmente — `getFirebaseAdminFirestore()` já faz isso sozinho.
- **`scripts/wix-sync-preview.ts`**: mantido sem mudança de lógica, só atualizar o comentário de topo (não faz mais sentido citar a UI que não existe mais).

### 6. Nova coleção Firestore: `logsSincronizacaoWix`

Sem mudança em `firestore.rules` nem `firestore.indexes.json`. Documento:

```
executadoEm: Timestamp (server)
origem: "cron" | "script-manual"
modo: "completo" | "incremental"
status: "ok" | "error"
message: string | null
ordersProcessados: number
pessoasCriadas, pessoasAtualizadas, turmasCriadas, turmasAtualizadas: number
recebimentosCriados, recebimentosAvisos: number
recebimentosPulados: { motivo: string; quantidade: number }[]
matriculasCriadas: number
```

### 7. Novos env vars

- `CRON_SECRET` — valor aleatório (`openssl rand -hex 32`).
- `RESEND_API_KEY` — nova conta Resend.
- `EMAIL_ALERTA_ADMIN` — e-mail da Mari Carvalho.
- `LIMITE_SEGURANCA_ORDERS` (opcional, ou constante no código).

Adicionar ao `.env` local (já gitignorado) **e** como Environment Variables no painel da Vercel — `.env` local não chega em produção sozinho.

### 8. Agendador: serviço de cron externo gratuito (não Vercel Cron)

Sem `vercel.json`. Configuração feita fora do repositório, direto no painel do serviço escolhido (ex. cron-job.org):

- Job novo, método `GET`, URL `https://<domínio-produção>/api/cron/wix-sync`.
- Frequência: de hora em hora.
- Header customizado: `Authorization: Bearer <valor de CRON_SECRET>`.
- Ativar notificação de falha do próprio serviço (a maioria alerta por e-mail quando a URL responde com erro/timeout) como camada extra além do alerta via Resend — o serviço externo detecta se o endpoint ficou de todo inacessível (deploy quebrado, domínio fora do ar), caso que o alerta interno via Resend não cobre porque depende da rota ter executado.
- Diferente do Vercel Cron, o serviço externo pode chamar a rota mesmo antes/durante deploys — o endpoint já responde 401 sem o secret certo, então não há risco de execução não autorizada; só considerar retries automáticos do próprio serviço em caso de timeout, se a opção existir, para não duplicar o alerta de falha.

## Gap que ainda fica pra depois (v2, este sim adiado)

Mesmo com alerta por e-mail, não há verificação de que o e-mail foi de fato entregue (bounce, spam, etc.) — se o alerta falhar silenciosamente, ainda depende de alguém checar `/wix-sync`. Aceitável por ora; se virar problema, considerar um segundo canal (ex. Slack) como redundância.

## Sequência de implementação

1. Escolher e criar conta no serviço de cron externo gratuito (ex. cron-job.org); confirmar que ele suporta header customizado (`Authorization: Bearer ...`) no plano gratuito.
2. Criar conta na Resend (plano free), gerar `RESEND_API_KEY`; verificar um domínio da Ovo no Resend (registros DNS — sem isso o envio pra `EMAIL_ALERTA_ADMIN` não funciona no free tier); confirmar o e-mail real da Mari Carvalho pra `EMAIL_ALERTA_ADMIN`. Adicionar `resend` ao `package.json`.
3. Adicionar `desde?: string` opcional a `searchApprovedOrders()` ([orders.ts](../src/core/wix/orders.ts)) — filtro `createdDate: { $gte: desde }`; validar contra a resposta real da Wix.
4. Criar `src/core/comunicacao/alertaSincronizacaoWix.ts` (envio via Resend, try/catch isolado).
5. Criar `src/core/wix/executarSincronizacao.ts` (extração + modo completo/incremental + `carregarExistentesRelevantes()` + circuit breaker + log em toda execução + alerta na transição ok→error).
6. `git mv src/app/(protected)/admin/wix-sync/ src/app/(protected)/wix-sync/`.
7. Deletar `actions.ts` (já movido).
8. Deletar `WixSyncPanel.tsx`; criar `WixSyncHistorico.tsx`.
9. Reescrever `page.tsx` (gate de sessão igual, corpo novo lendo `logsSincronizacaoWix`).
10. Adicionar `roles?: readonly Role[]` a `NavChild` em `navItems.ts`, criar o helper `childrenVisiveisParaRole`, adicionar o child `{ label: "Sincronização Wix", href: "/wix-sync", roles: ["admin"] }` em "Configurações"; atualizar `AppSidebar.tsx` e `MobileNavSheet.tsx` pra usar o helper ao renderizar `item.children`.
11. Adicionar `CRON_SECRET`, `LIMITE_SEGURANCA_ORDERS`, `RESEND_API_KEY`, `EMAIL_ALERTA_ADMIN` ao `.env` local.
12. Criar `src/app/api/cron/wix-sync/route.ts`.
13. Refatorar `scripts/wix-sync-confirm.ts` (testar import sob `tsx`); atualizar comentário de `scripts/wix-sync-preview.ts`.
14. Configurar `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_ALERTA_ADMIN` no painel da Vercel.
15. Testar localmente: `curl` sem secret/com secret errado → 401; com secret certo → 200 e novo doc em `logsSincronizacaoWix`. Testar o circuit breaker (limite baixo temporário). Testar o alerta (forçar erro num ambiente de teste e confirmar 1 único e-mail mesmo com falhas repetidas). Testar a sidebar com um usuário `comunicacao` e confirmar que "Sincronização Wix" não aparece.
16. Deploy.
17. Criar o job no serviço de cron externo (URL de produção + header `Authorization: Bearer $CRON_SECRET` + frequência horária); disparar manualmente uma vez pelo painel do serviço pra confirmar 200 antes de deixar no automático.
18. Acompanhar os primeiros dias via a tela de histórico, com atenção especial à primeira reconciliação completa de domingo, antes de considerar "confiável em uso real" (mesma régua já aplicada a outras features do projeto).
19. Checar a aba de uso do Firestore no console do Firebase depois da primeira semana completa.

## Verificação

- `npx tsc --noEmit` depois de cada etapa (nunca rodar `next dev`/`rm -rf .next` neste repo — servidor do usuário já roda nele).
- `curl` no endpoint (401 sem secret, 200 com secret) antes de configurar o cron real.
- Circuit breaker: baixar `LIMITE_SEGURANCA_ORDERS` temporariamente, confirmar abort sem nenhuma escrita fora do log.
- Rodar `scripts/wix-sync-confirm.ts` manualmente uma vez após o refactor pra confirmar que o comportamento de escrita não mudou.
- Forçar o modo incremental manualmente e comparar com o resultado do modo completo pro mesmo lote — validação de equivalência antes de confiar no caminho novo.
- Depois do deploy, abrir `/wix-sync` (via link em "Configurações" na sidebar, não só por URL direta) e confirmar histórico, sessão/role, campos `modo`/`ordersProcessados` corretos, e que o item some da sidebar pra um usuário `comunicacao`.

## Critical files

- [actions.ts](../src/app/(protected)/admin/wix-sync/actions.ts) (fonte da extração; pasta inteira se move pra `src/app/(protected)/wix-sync/`)
- [sync.ts](../src/core/wix/sync.ts) (funções puras reaproveitadas, não mexer)
- [orders.ts](../src/core/wix/orders.ts) (ganha o parâmetro `desde`)
- `page.tsx` e `WixSyncPanel.tsx` (movidos de `admin/wix-sync/` pra `wix-sync/`)
- [navItems.ts](../src/components/shell/navItems.ts), [AppSidebar.tsx](../src/components/shell/AppSidebar.tsx), [MobileNavSheet.tsx](../src/components/shell/MobileNavSheet.tsx) (novo item na sidebar + filtro de roles por child)
- `scripts/wix-sync-confirm.ts` e `scripts/wix-sync-preview.ts`
- [firebaseAdmin.ts](../src/core/firebase/firebaseAdmin.ts) (lazy-init já pronto, reaproveitar)
- `src/core/comunicacao/alertaSincronizacaoWix.ts` (novo, envio via Resend)
- Configuração do agendador fica fora do repositório: job no painel do serviço de cron externo (ex. cron-job.org) apontando pra `/api/cron/wix-sync`
