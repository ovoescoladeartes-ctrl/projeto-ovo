# Plano: redução de leituras do Firestore — Fase 2 (doc-gets) e Fase 3 (demais rotas)

Este documento é um **plano de implementação, ainda não executado**. Nenhum código foi alterado a partir dele.

## Contexto

Em 2026-09-21 a produção caiu com `Application error` / digest opaco — causa confirmada: `8 RESOURCE_EXHAUSTED: Quota exceeded` do Firestore (cota diária do plano Spark, 50 mil leituras/dia). A causa raiz não era volume de dados (a base tem ~300-600 documentos no total), e sim que o app lia coleções inteiras, em duplicidade, a cada interação, sem nenhuma camada de cache.

**Já em produção (`main`):**
- **Fase 0** (PR #60 → #61): debounce e mínimo de caracteres maiores na busca global e no combobox de pessoa; novo `src/app/(protected)/error.tsx` (não existia nenhum error boundary — por isso a queda apareceu como digest opaco).
- **Fase 1** (PR #62): camada de repositório cacheada em `src/core/db/` — uma função `ler<Coleção>()` por coleção, embrulhada em `unstable_cache` (Data Cache da Vercel, tag = nome da coleção) + `cache()` do React (dedupe dentro do mesmo render). As funções de agregação da Home (`montarVisaoGeral`, `montarKpisEPendenciasFinanceiro/Comunicacao`, `montarPendenciasAcionaveis`) viraram puras — recebem os arrays já lidos, não tocam o Firestore. A Home (`/`) e `/checklists` foram migradas; a busca global e o combobox de pessoa também. Todo write site que existia até então troca `revalidatePath` direto por `revalidarColecoes()` ([src/core/db/revalidar.ts](../src/core/db/revalidar.ts)), o ponto único de invalidação.

**Resultado da Fase 1:** a Home caiu de ~900 para ~25 leituras por render com cache frio, e ~0 com cache quente. As ~25 restantes são exatamente o que este documento resolve na Fase 2 — doc-gets por chave (dia/semana/mês) que ainda não passam pelo repositório cacheado.

Este documento cobre o que ficou de fora da Fase 1: os doc-gets do Ritual/Fechamento/Checklist do Dia (**Fase 2**) e as demais rotas do app que ainda leem o Firestore direto (**Fase 3**).

## Regras invioláveis do cache

Já documentadas em [src/core/db/cacheDeColecao.ts](../src/core/db/cacheDeColecao.ts) e verificadas direto no fonte do Next 15.5.20 instalado (`node_modules/next/dist/server`) — reproduzidas aqui porque toda função nova deste plano precisa seguir as mesmas quatro regras:

1. **Função de repositório é folha.** `unstable_cache` aninhado dentro de outro pula a leitura do cache **em silêncio** (sem erro, sem log) — nunca chamar uma função `ler*()`/`lerPreferenciasSistema`/etc. de dentro de outra função também cacheada.
2. **Nunca `cookies()`/`headers()`/`getServerSession()` dentro do cache** — o Next lança em runtime. O gate de role fica sempre em quem chama (page.tsx, server action).
3. **`revalidateTag` lança durante a fase de render** — só é permitido em `after()`, action ou route handler.
4. **Só valor JSON-safe.** `toIso()` cobre `Timestamp`; `?? null` em todo campo opcional.

Uma regra adicional, confirmada ao ler o fonte do `unstable_cache`: os **argumentos da função entram na chave do cache automaticamente** (`invocationKey = fixedKey-JSON.stringify(args)`). Isso é o que torna seguro cachear por chave de documento (`lerRitualSemana("2026-09-14")` e `lerRitualSemana("2026-09-21")` são entradas de cache diferentes) sem precisar de nenhum código extra de chaveamento.

## Fase 2 — Doc-gets do Ritual, Fechamento e Checklist do Dia

Elimina as ~25 leituras de doc que ainda restam por render da Home: 13 em `ritualSemanas` (1 da semana atual + 8 de `buscarPendenciasRitualHerdadas` + ~4-5 de `buscarFechamentoDoMes`, que relê o Ritual de cada segunda-feira do mês), 10 em `checklistComunicacaoDias` (1 do dia + 8 anteriores + 1 da transação de materialização), 1 em `fechamentosMensais`.

### 2.1 — Ritual financeiro: `lerRitualSemana(semana)`

Em [src/core/db/](../src/core/db/), novo arquivo `ritual.ts`:

```ts
export const lerRitualSemana = cacheDeColecao("ritualSemana", "ritualSemanas", async (semana: string): Promise<RitualSemanaPlano> => {
	// mesmo mapper de buscarRitualDaSemana (src/core/financeiro/ritual/consultas.ts:55-58)
});
```

Uma entrada de cache **por semana**, não por lista de semanas — se o parâmetro fosse um array de chaves, toda virada de semana geraria uma chave de cache totalmente nova (miss completo); por doc individual, 7 das 8 semanas anteriores sobrevivem à virada.

`buscarPendenciasRitualHerdadas` ([src/core/financeiro/ritual/consultas.ts:69-104](../src/core/financeiro/ritual/consultas.ts)) troca o loop de `firestore.collection(COLECAO).doc(semana).get()` (linha 81) por `lerRitualSemana(semana)`. A função continua `async`, mas não faz mais I/O direto — só orquestra chamadas ao repositório.

**Atenção ao ponto de reuso:** [src/core/financeiro/fechamento/consultas.ts:77](../src/core/financeiro/fechamento/consultas.ts) já chama `buscarRitualDaSemana(firestore, semana)` internamente, uma vez por segunda-feira do mês. Depois desta mudança, `buscarRitualDaSemana` (a função exportada, usada pela Home para "a semana atual") deve **ela também** chamar `lerRitualSemana(semana)` por baixo, em vez de duplicar a query. Assim a mesma leitura da semana atual, se ela também aparecer no Fechamento do mês corrente, é servida do mesmo cache.

### 2.2 — Fechamento mensal: `lerFechamentoMes(periodo)`

Novo arquivo `src/core/db/fechamento.ts`, `lerFechamentoMes(periodo: string)` cacheando só a leitura do doc `fechamentosMensais/{periodo}` ([financeiro/fechamento/consultas.ts:73](../src/core/financeiro/fechamento/consultas.ts)). `buscarFechamentoDoMes` continua orquestrando (chama `lerFechamentoMes` + `lerRitualSemana` de cada segunda via 2.1), mas para de fazer `.get()` direto.

### 2.3 — Checklist do Dia: separar leitura de escrita

Esta é a parte mais delicada — **`materializarChecklistDoDia`** ([src/core/comunicacao/checklist/consultas.ts:119-139](../src/core/comunicacao/checklist/consultas.ts)) escreve no Firestore (`runTransaction`) dentro do caminho de leitura que a Home chama a cada render. Não dá para colocar escrita dentro de `unstable_cache` (regra 3 acima).

**Por que é seguro adiar essa escrita sem mudar o que a tela mostra:** em `buscarChecklistComunicacaoDoDia` ([consultas.ts:161-213](../src/core/comunicacao/checklist/consultas.ts)), `docHoje` é lido **antes** de `materializarChecklistDoDia` rodar (linha 168-171, materialização na 173). O seed que a materialização grava é `{ concluido: false }` (linha 128 do arquivo atual), que a UI trata de forma idêntica a "sem entrada nenhuma" — `contatosHoje[id]?.concluido !== true` (linhas 186, 191) e `montarItem` fazendo `estado?.concluido ?? false` (linha 94-104). A escrita existe só para os **dias seguintes** saberem que aquele contato já estava pendente hoje (ver o comentário original em `materializarChecklistDoDia`, linhas 106-118) — não influencia o que a Home renderiza agora.

**Desenho:**
- `lerRitualSemana`-style: `lerChecklistDia(dia: string)` em `src/core/db/checklistComunicacao.ts`, cacheando só o `.doc(dia).get()` (substitui a leitura de `docHoje` e cada item de `buscarIdsIncompletosDiasAnteriores`, [consultas.ts:142-160](../src/core/comunicacao/checklist/consultas.ts)).
- `src/core/comunicacao/checklist/consultas.ts` vira 100% puro: `buscarChecklistComunicacaoDoDia` para de receber `firestore` e passa a receber os docs já lidos (`docHoje`, os 8 docs anteriores) como parâmetro, igual ao padrão que `listarContatosPendentes` já usa desde a Fase 1 (recebe `contatosAtivos` em vez de ler).
- `materializarChecklistDoDia` sai deste arquivo para um novo `src/core/comunicacao/checklist/materializar.ts`, com o corpo **inalterado** (a transação continua sendo a proteção contra sobrescrever uma conclusão concorrente — ela relê o doc dentro da transação e só grava os ids que ela mesma confirma ausentes no commit; isso não muda). Única mudança de assinatura: retorna `Promise<number>` (quantos ids semeou) em vez de `void`, para o chamador só invalidar quando algo de fato foi escrito.
- Em [src/app/(protected)/page.tsx](../src/app/(protected)/page.tsx), a chamada a `buscarChecklistComunicacaoDoDia` passa a vir só dos dados já lidos (síncrona ou quase), e a materialização entra dentro de `next/server`'s `after()`:

```ts
import { after } from "next/server";
// ...
if (idsParaMaterializar.length > 0) {
	after(async () => {
		const semeados = await materializarChecklistDoDia(getFirebaseAdminFirestore(), dia, idsParaMaterializar);
		if (semeados > 0) {
			revalidarColecoes(["checklistComunicacaoDias"]);
		}
	});
}
```

`after()` roda depois da resposta ser enviada, com `phase: 'after'` — é aí que `revalidateTag`/`revalidateColecoes` são permitidos fora de uma action (regra 3). O guard `idsParaMaterializar.length > 0` já elimina a transação inteira (e sua leitura) no caso comum — hoje ela roda em **todo** render da Home, mesmo sem nada a fazer.

A mesma reestruturação vale para `/checklists` ([src/app/(protected)/checklists/page.tsx](../src/app/(protected)/checklists/page.tsx)), que chama a mesma função.

**Não precisa mudar:** os write sites que já existem (`caixa/checklist/actions.ts`, `caixa/fechamento/actions.ts`, `vagoes/checklist/actions.ts`) já chamam `revalidarColecoes(["ritualSemanas"|"fechamentosMensais"|"checklistComunicacaoDias"], ...)` desde a Fase 1. Como `revalidateTag` invalida **todas** as entradas de cache daquela tag, independente da chave (semana/período/dia), o cache por-doc introduzido nesta fase continua sendo invalidado corretamente sem tocar nesses arquivos.

### Verificação da Fase 2

- `npx tsc --noEmit` — a mudança de assinatura de `buscarChecklistComunicacaoDoDia` aponta qualquer call site esquecido.
- Depois de marcar um item do Checklist do Dia, confirmar que ele aparece marcado tanto na Home quanto em `/checklists` (mesmo cache, tags compartilhadas).
- Confirmar que um contato pendente hoje aparece em "Pendências anteriores" amanhã (o comportamento que a materialização existe para preservar) — só validável no dia seguinte, ou simulando com uma data futura em ambiente local.

## Fase 3 — Demais rotas

Nenhum destes arquivos foi tocado pelas Fases 0/1 nem pelo motor de checklist genérico (PR #52-56) — conferir com `git diff origin/main -- <arquivo>` antes de começar, dado que o repo tem múltiplos colaboradores ativos e pode ter mudado desde a escrita deste documento.

| Rota | Arquivo | Leituras hoje | Troca |
|---|---|---|---|
| `/caixa` | [caixa/page.tsx:68-72](../src/app/(protected)/caixa/page.tsx) | `recebimentos`, `repasses`, `pessoas`, `turmas` inteiras | `lerRecebimentos()`, `lerRepasses()`, `lerPessoas()`, `lerTurmas()` |
| `/pessoas` | [pessoas/page.tsx:77-81](../src/app/(protected)/pessoas/page.tsx) | `pessoas` (filtro `ativo`), `turmas` (ativas), `matriculas` (ativas) | `lerPessoas()`/`lerTurmas()`/`lerMatriculas()`, filtro em memória no lugar do `where` |
| `/pessoas/turmas` | [pessoas/turmas/page.tsx:163-167](../src/app/(protected)/pessoas/turmas/page.tsx) | `turmas` (filtro), `pessoas` inteira, `matriculas` (ativas) | idem |
| `/pessoas/[id]` | [pessoas/[id]/page.tsx:119-123](../src/app/(protected)/pessoas/%5Bid%5D/page.tsx) | 1 doc `pessoas`, `turmas` inteira, `matriculas`/`recebimentos` filtradas por `pessoaId` | `turmas`/`matriculas`/`recebimentos` viram `lerTurmas()`/`lerMatriculas()`/`lerRecebimentos()` + `.filter(x => x.pessoaId === id)`; o doc da própria pessoa (`pessoas.doc(id).get()`) pode continuar direto (leitura única, sem duplicação) ou usar `lerPessoas().find(...)` — decidir pelo custo real: se a rota é pouco acessada, a leitura direta já é barata o bastante |
| `/vagoes` | [vagoes/page.tsx:67-69,108-110](../src/app/(protected)/vagoes/page.tsx) | `contatos` (ativos, com `historico`), `mensagens` (ativas), e condicionalmente `matriculas`/`turmas` | **Não usar `lerContatosAtivos()`** — ele exclui `historico` de propósito (ver decisão abaixo). `mensagens`/`matriculas`/`turmas` migram normalmente |
| `/mensagens` | [mensagens/page.tsx:40](../src/app/(protected)/mensagens/page.tsx) | `mensagens` (ativas) | Novo `src/core/db/mensagens.ts`, `lerMensagensAtivas()` |
| `/admin/usuarios` | [admin/usuarios/page.tsx:36](../src/app/(protected)/admin/usuarios/page.tsx) | `users` inteira, `orderBy criadoEm desc` | Novo `src/core/db/users.ts`, `lerUsuarios()` — `admin/usuarios/actions.ts` já invalida a tag `"users"` desde a Fase 1 |
| busca de duplicata / listagem | [core/interesses/actions.ts:30-34](../src/core/interesses/actions.ts) (`listarInteressesAtivos`) | `interesses` (ativos) | Novo `src/core/db/interesses.ts`, `lerInteressesAtivos()` — `upsertInteresse` já chama `revalidarColecoes(["interesses"])` desde a Fase 1, só falta o lado de leitura |

**Decisão a confirmar sobre `/vagoes` e `historico`:** `ContatoResumo` ([src/core/db/contatos.ts](../src/core/db/contatos.ts)) exclui `historico` de propósito — é o único array não limitado do domínio (cresce a cada `registrarInteracaoContato`, sem teto), e trazê-lo pra toda entrada cacheada arriscaria se aproximar do limite de 2MB por entrada do Data Cache em algum contato antigo/muito ativo. `/vagoes` é o único consumidor que precisa de `historico`. Duas opções, a decidir na hora:
1. Manter a leitura direta de `contatos` em `/vagoes` (mais simples, é uma rota só).
2. Criar `lerContatosAtivosComHistorico()` cacheado à parte, com o mesmo teto por entrada verificado antes de ativar (ver a tabela de tamanhos da Fase 1: nenhuma entrada hoje passa de ~50KB; `historico` é o único campo sem limite conhecido).

A opção 1 é a mais simples e é a recomendação por padrão, a menos que `/vagoes` se mostre um consumidor de cota relevante depois de medir.

Cada rota migrada segue o mesmo padrão da Home: trocar `firestore.collection(...).get()` por `ler*()`, mover qualquer `where` que sirva só àquela página para `.filter()` em memória (mantendo o `where`+`orderBy` só onde já existe índice composto declarado — hoje só `contatos` tem um, em `firestore.indexes.json`), e conferir se a mesma coleção já é lida em outro lugar da mesma página antes de duplicar.

### Verificação da Fase 3

Mesmo roteiro de cada fase anterior:
1. `npx tsc --noEmit`.
2. `grep -rn '\.collection("' src/app src/core | grep -v 'src/core/db/\|src/core/wix/\|actions\.ts$'` deve voltar vazio ao final desta fase — esse é o critério de "pronto": nenhuma leitura de coleção sobrevive fora do repositório, das actions de escrita e do módulo Wix (que já tem sua própria lógica de sync, fora de escopo deste plano).
3. Contador de leituras (`DEBUG_FIRESTORE_READS=1`, ver [src/core/db/leituras.ts](../src/core/db/leituras.ts)) num horário de baixo uso: abrir cada rota migrada duas vezes seguidas — a primeira mostra `MISS` por coleção nova, a segunda não deve mostrar nada.
4. Firebase Console → Firestore → Uso, gráfico de leituras/dia — o juiz final, com ~24h de latência.

## Riscos que valem revisão ao implementar

- **Aninhamento silencioso de `unstable_cache`** continua sendo o risco nº 1 em qualquer arquivo novo deste plano — nenhuma função `ler*()` pode chamar outra função `ler*()`. `buscarFechamentoDoMes`/`buscarPendenciasRitualHerdadas` orquestram chamadas a `lerRitualSemana`, mas **elas mesmas não podem virar `cacheDeColecao(...)`** — continuam funções `async` comuns, exportadas de `financeiro/ritual/consultas.ts`/`financeiro/fechamento/consultas.ts`, não de `src/core/db/`.
- **`after()` é relativamente novo na API do Next** — testar que o efeito (materialização do dia seguinte) realmente acontece, não só que a Home renderiza certo. Um jeito barato de verificar: marcar `DEBUG_FIRESTORE_READS=1` e confirmar que a materialização loga uma leitura de transação só quando `idsParaMaterializar` não está vazio.
- **Evicção do Data Cache é best-effort** — nada neste plano deve tratar o cache como fonte de verdade; todo dado cacheado é recomputável a partir do Firestore a qualquer momento.
