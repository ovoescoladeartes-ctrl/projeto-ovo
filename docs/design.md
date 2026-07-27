# Trilho (OVO) — Design System

## Origem e confiança

Extraído de 2 screenshots do Figma (`Trilho-App`, node-id `176-1565`, tela "Dashboard",
estados de aba Comunicação e Financeiro), enviados diretamente pelo usuário em
2026-07-27. **Não houve acesso ao Figma via MCP/Dev Mode nesta sessão** — o servidor MCP
do Figma não estava conectado e o fetch direto ao link retornou 403. Isso significa que
valores de cor, tipografia e espaçamento abaixo são **leituras visuais estimadas**, não
tokens exportados. Cada linha da tabela abaixo está marcada como `estimado` (validar
contra o Figma assim que houver acesso ao Dev Mode) ou `estrutural` (fato de layout
inequívoco a partir das capturas, não depende de medição exata).

Quando o acesso ao Figma MCP for restabelecido, revisar este documento inteiro contra o
arquivo real antes de confiar cegamente nos valores aqui.

---

## Tokens

### Cor

| Token | Valor estimado | Confiança | Mapeia para (shadcn/Tailwind) | Uso |
|---|---|---|---|---|
| Fundo de página | neutral-100 (~`#F5F5F4`) | estimado | `--background` | Fundo geral da área de conteúdo |
| Superfície de card | branco `#FFFFFF` | estimado | `--card` | Cards de KPI, pendências, ritual |
| Borda de card | cinza clara, 1px | estimado | `--border` | Contorno sutil dos cards |
| Texto primário | quase-preto (neutral-900) | estimado | `--foreground` / `--card-foreground` | Títulos, números grandes |
| Texto secundário/muted | cinza médio (neutral-500) | estimado | `--muted-foreground` | Labels, subtítulos, meta info |
| Superfície escura (banner de alerta, badge de contagem) | quase-preto/navy (neutral-900) | estimado | `--primary` | Banner de alerta, badge de contagem, botões invertidos |
| Texto sobre superfície escura | branco | estimado | `--primary-foreground` | Texto do banner, badge |
| Botão outline ("Ver") | fundo branco, borda preta 1px, texto preto | estimado | `Button variant="outline"` (padrão shadcn, sem token novo) | Botões "Ver" nas pendências |

### Tipografia

| Token | Valor estimado | Confiança | Uso |
|---|---|---|---|
| Família | Inter (via `next/font`) | **estimado, não confirmado** — nenhuma fonte de exibição identificável com confiança nas capturas | Padrão do app inteiro |
| Título "Dashboard" | bold, ~28–32px | estimado | Título da página |
| Número de KPI | bold, ~28–32px | estimado | Valor grande dos cards de KPI |
| Label de card | uppercase, letter-spacing, ~11–12px, cinza | estimado | Rótulo acima do número (ex: "SALDO VIVO") |
| Texto de corpo/meta | regular, ~13–14px, cinza | estimado | Subtítulos, meta info das pendências |

### Espaçamento / Grid

| Token | Valor | Confiança | Uso |
|---|---|---|---|
| Largura do rail lateral | ~64px | estrutural | Sidebar de ícones, colapsada |
| Grid de KPIs — aba Comunicação | 2 colunas | estrutural | "Alunos ativos", "Leads da semana" |
| Grid de KPIs — aba Financeiro | 4 colunas | estrutural | "Recebido no mês", "A liberar do Wix", "Saldo vivo", "Alunos ativos" |
| Grid de estágios do funil | 6 colunas | estrutural | Só aba Comunicação |
| Layout geral | conteúdo à direita do rail, largura fluida | estrutural | Sem largura máxima aparente nas capturas |

### Radius e sombra

| Token | Valor | Confiança | Uso |
|---|---|---|---|
| Radius de card | ~0.75rem (mais arredondado que o default 0.5rem do shadcn) | estimado | Todos os cards, banner, inputs |
| Sombra | nenhuma elevação visível — só borda 1px | estimado | Cards usam borda, não `shadow` pesado |

### Responsividade

**Não especificado no Figma** — as capturas são desktop-only. Tratado como decisão em
aberto; o layout atual do app já tem um breakpoint mobile (nav empilhada) que precisa ser
reconciliado com o rail de ícones numa etapa futura, fora do escopo desta primeira
implementação.

---

## Inventário de componentes

| Elemento visual | Primitivo shadcn | Wrapper customizado |
|---|---|---|
| Cards de KPI, pendências, ritual | `Card` | `KpiCard`, `PendenciaRow` (dentro de `PendenciasList`) |
| Abas Comunicação/Financeiro | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | — |
| Badge de contagem ("3"), badge "3/5 concluídos" | `Badge` | — |
| Barra de busca do Copiloto | `Input` (`disabled`) | `CopilotoInput` |
| Itens do checklist "Ritual de segunda" | `Checkbox` + `Label` (`checked`+`disabled`) | `RitualChecklistItem`, `RitualChecklist` |
| Botões "Ver", "Abrir pessoa" | `Button` (`variant="outline"` / `variant="default"` sobre fundo escuro) | — |
| Avatar do usuário | `Avatar`, `AvatarFallback` | — |
| Menu do avatar (logout) | `DropdownMenu` | `UserMenu` |
| Ícones do rail lateral | `Button variant="ghost" size="icon"` + `Tooltip` | `SideNav` |
| Separadores | `Separator` | — |
| Banner de alerta escuro | — | `AlertBanner` (composição de `Card`-like + `Button`) |
| Cards de estágio do funil | — | `FunnelStageCard`, `FunnelStageRow` |
| Cabeçalho da página (título + busca + data) | — | `DashboardHeader` |

Biblioteca de ícones: **lucide-react** (estilo de traço fino consistente com os ícones do
Figma).

---

## MANDATÓRIO — Política de biblioteca de componentes

Esta seção vale para **qualquer sessão de implementação futura**, mesmo sem o contexto
desta conversa:

1. **Toda UI nova deve ser construída com shadcn/ui.** Instale componentes via
   `pnpm dlx shadcn@latest add <componente>` — eles entram em `src/components/ui/`.
   Não reimplemente à mão um componente que o shadcn já oferece (botão, card, dialog,
   dropdown, input, checkbox, tabs, etc).
2. **Antes de adicionar qualquer outra biblioteca de UI** (outro kit de componentes,
   styled-components/emotion, outro set de ícones que não `lucide-react`), verifique
   `components.json` e este arquivo primeiro. Se o shadcn cobre a necessidade, use o
   shadcn.
3. **Arquivos em `src/components/ui/**` são gerenciados pelo shadcn CLI**: mantenha os
   nomes kebab-case padrão e não edite à mão fora do fluxo `shadcn add`/diff, para que o
   CLI continue conseguindo atualizá-los. Esta é uma exceção explícita e intencional à
   convenção PascalCase do resto do repositório, escopada só a `ui/`. Componentes fora de
   `ui/` continuam PascalCase normalmente.
4. **Tokens novos entram via `tailwind.config.ts` + as variáveis CSS que o `shadcn init`
   já configurou em `src/app/globals.css`** — nunca crie um segundo sistema de tokens
   paralelo (nada de `--ovo-*` novo) a menos que nenhum slot existente do shadcn sirva
   para o caso. Se isso acontecer, documente o motivo na tabela de tokens deste arquivo.

---

## Perguntas e premissas em aberto

1. **Estágios do funil de Comunicação**: o Figma mostra 6 cards ("Lead novo", "Em
   conversa", "Experimental", "Matriculado", "Ex-aluno", "Não convertido"), enquanto o
   `mini-prd.md` define 5 estágios do board de Vagões (novo → em conversa → experimental
   → convertido, + arquivar). **Decisão confirmada com o usuário**: "Ex-aluno" e "Não
   convertido" são tratados como **sub-estados/motivos de "arquivado"**, não estágios
   novos do board — os 5 estágios do PRD permanecem como fonte de verdade estrutural.
2. Cores, tipografia e espaçamentos exatos precisam de validação contra o Figma real
   assim que o acesso via MCP for restabelecido.
3. Mapeamento ícone → rota da sidebar (home, workflow/Vagões, pessoas, wallet/Caixa,
   configurações) foi inferido pela forma dos ícones nas capturas, não confirmado no
   Figma.
4. O chevron de toggle da sidebar não tem um estado "expandido" desenhado nas capturas —
   tratado como decorativo/desabilitado até haver um design para esse estado.
