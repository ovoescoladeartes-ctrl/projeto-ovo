# CLAUDE.md

Instruções para quem (ou qual agente) for mexer no projeto **ovo-escola**. Válido para qualquer sessão, humana ou de IA.

## 1. Branches

- `main` é a branch de **produção**. Nunca commitar direto nela.
- `developer` parte de `main` e serve para subir mudanças antes de produção — é onde PRs são comparados para garantir que nada quebra em `main`.
- Cada colaborador cria uma **branch nova** a partir de `developer` para cada tarefa. Nunca reaproveitar uma branch antiga de outra tarefa.
- Antes de dar `push` para o GitHub, confirmar que está na branch correta (`git status` / `git branch --show-current`).

### No início de todo chat sobre este projeto

1. Rodar `git status` / `git branch --show-current` para ver em qual branch está.
2. Avaliar se faz sentido dar `git pull` em `developer` ou `main` (dependendo do que a tarefa exige) antes de começar a trabalhar.
3. Não assumir que a branch local está atualizada — verificar sempre.

## 2. Componentes e UI

- O projeto usa **shadcn/ui** (`components.json`, style `new-york`, componentes em `src/components/ui`).
- Antes de criar qualquer componente novo:
  1. Revisar os componentes já existentes no projeto (`src/components/ui`, `src/components/shell`, `src/components/dashboard`) — priorizar reutilização.
  2. Se não houver nada reutilizável, verificar se existe um componente equivalente no shadcn e importar de lá (`npx shadcn add <componente>`).
  3. Só criar um componente do zero se nenhuma das opções acima resolver.

## 3. Design

- Toda tarefa que envolva UI/design deve começar lendo [`docs/design.md`](docs/design.md) antes de qualquer implementação.

## 4. Acessos e roles

- Cadastro nunca atribui role sozinho — toda conta nova fica com `role: "pendente"` até um admin liberar em `/admin/usuarios`.
- Roles válidas: `admin`, `financeiro`, `comunicacao`, `educador` (ver `src/core/auth/Role.ts`).
- `scripts/set-role.ts` é só para bootstrap do primeiro admin — no dia a dia, usar a UI `/admin/usuarios`.

## 5. Dev server

- **Nunca** rodar `next dev` (mesmo em outra porta) ou `rm -rf .next` sem antes checar se já existe um servidor rodando neste diretório — o `.next` é compartilhado pelo diretório de trabalho, não pela porta, e derrubar/reconstruir corrompe a sessão de quem já está com o servidor no ar.
- **Nunca rodar `pnpm run build` (build de produção) na mesma pasta enquanto um `next dev` está no ar** — os dois escrevem em `.next` com estruturas incompatíveis entre si; um por cima do outro corrompe o cache do dev server (sintoma: erro `MODULE_NOT_FOUND` ao servir qualquer página) e força reiniciar. Se precisar confirmar que o build de produção passa, rode e, se o dev server quebrar por causa disso, reinicie-o depois (avise antes de reiniciar o servidor de quem já está com ele aberto).
- Para verificar corretude de TypeScript sem esse risco, usar `npx tsc --noEmit` (não conflita com um `next dev` em execução).

## 6. Cota do Firebase (plano gratuito) — cuidado em dia de iteração intensa

O projeto está no plano gratuito do Firebase (Spark), com teto diário rígido de requisições — diferente do Blaze (pago sob demanda), não tem margem: ao bater no teto, o app inteiro fica fora do ar **para todo mundo** (não só quem estava testando), com erro `UNAUTHENTICATED`/`RESOURCE_EXHAUSTED` do lado do servidor, até resetar (meia-noite, horário do Pacífico) ou o plano ser trocado pra Blaze. Isso já aconteceu (2026-09-21, dia com várias rodadas de ajuste no motor de checklist testadas em produção) — o app não estava sendo mal usado, foi o volume de testes/deploys do próprio dia de trabalho que consumiu a cota.

Por que o custo sobe rápido num dia assim:
- O Dashboard (`src/app/(protected)/page.tsx`) já dispara **~13 consultas em paralelo por carregamento** (KPIs, pendências, Ritual, Fechamento, Materiais, checklists customizados), várias delas fazendo loop interno por semana — um carregamento só passa fácil de 30–50 leituras no Firestore.
- **Todo `router.refresh()` nos componentes de checklist recarrega essa árvore inteira**, não só o item que mudou (`ChecklistItemToggle`, `ChecklistAcaoRow`, `FechamentoTarefaDetalhe` — busca de novo os dados do zero pra garantir consistência). Cada clique de teste custa o mesmo que abrir o Dashboard do zero.
- Cada merge pra `developer`/`main` dispara build+deploy em **mais de um projeto Vercel** ligado a este repositório (hoje: `projeto-ovo` e `projeto-ovo-escola` — vale checar se os dois são realmente necessários ou se um é redundante).

Práticas para reduzir o risco, num dia de trabalho com várias rodadas de mudança:
- **Evitar reiniciar o servidor dev sem necessidade real** — cada reinício custa pelo menos um carregamento completo do Dashboard.
- **Agrupar mudanças relacionadas antes de promover pra `developer`/`main`**, em vez de dar merge de cada rodada pequena separadamente — menos merges, menos deploys, menos carregamentos de verificação em produção.
- **Testar localmente o quanto der antes de promover** — reservar o teste em produção pra confirmação final de um conjunto de mudanças, não pra cada iteração.
- Se o uso real do app (não só desenvolvimento) já se aproximar da cota gratuita, considerar migrar pro plano Blaze — remove o corte duro, mantendo a mesma cota gratuita generosa como piso (não passa a cobrar do zero).
