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
  1. Revisar os componentes já existentes no projeto (`src/components/ui`, `src/components/shell`, `src/components/dashboard`, `src/components/copiloto`) — priorizar reutilização.
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
- Para verificar corretude de TypeScript/build sem esse risco, usar `npx tsc --noEmit`.
