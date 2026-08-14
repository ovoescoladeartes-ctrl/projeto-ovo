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
| Fundo de botão de perigo/destrutivo | `#9C0000` | implementado | `--danger` / `Button variant="destructive"` | Confirmação de ação destrutiva (ex.: excluir permanentemente) |
| Texto sobre botão de perigo | `#F9FAFB` | implementado | `--danger-foreground` | Idem |
| Borda forte (controles interativos) | `#d8d8d3` | implementado | `--border-strong` / `border-border-strong` | Checkbox, trilho do segmented control — mais escura que `--border` (bordas leves de card/tabela) |
| Texto terciário/apagado | `#b3b3ac` | implementado | `--tertiary` / `text-tertiary` | Estados apagados (ex.: botão "Exportar" sem seleção) |
| Fundo de hover sutil | `#e9e9e4` | implementado | `--surface-hover` / `bg-subtle` | Estado de hover de controles com fundo branco/bordado (chip inativo, aba inativa) — `--accent` (oklch 0.97) é quase idêntico a `--background` (oklch 0.976) e não serve pra esse fim, hover fica imperceptível |

Origem desta leva de tokens: "Prompt de implementação — Cadastro (Pessoas & Turmas)", validado
pelo usuário em 2026-08-12, com uma captura de tela de referência interativa da listagem de
Pessoas. Os valores de `bg-page`/`text-primary`/`text-secondary` desse documento já bateram (ou
ficaram próximos o bastante) dos tokens `--background`/`--foreground`/`--muted-foreground`
existentes — não duplicados. `--surface-hover` foi acrescentado depois, no round de bugs de
2026-08-12 (teste real encontrou hover imperceptível em vários controles).

**Atualização — 2026-08-13 (round de padronização):** as alturas exatas (36px/30px por tipo de
controle) e os tokens `--surface-soft`/`--surface-soft-hover`/`bg-soft`/`bg-soft-hover` e
`--surface-track`/`bg-track` pedidos nos rounds anteriores foram **revertidos** — feedback de
revisão determinou que customizar visualmente componentes shadcn além do necessário não vale a
pena nesta fase; o padrão default do shadcn, seguindo Dashboard/Vagões como referência, é
suficiente. `--border-strong`/`bg-subtle`/`--tertiary` continuam vivos porque ainda têm uso real
(`Checkbox`, `Chip`, `ExportarDropdown`) — não foram tocados por essa reversão.

### Armadilha conhecida — `className` em cima de um `Button` com `variant`

`src/components/ui/button.tsx` mescla `className` **dentro** de `buttonVariants({ variant, size,
className })`, que usa `clsx` internamente (sem tailwind-merge) — duas classes `hover:bg-*`
diferentes (uma vinda do `variant`, outra do seu `className`) coexistem no HTML final, e quem
vence no navegador é a ordem em que o Tailwind gerou as regras no CSS, não a ordem das classes no
JSX. Isso é **não determinístico** o bastante pra já ter causado um bug real (hover de "Filtros
avançados" não aparecendo). Ao sobrescrever `hover:`/cor de um `Button` existente via `className`,
use o sufixo `!` (ex.: `hover:!bg-soft-hover`) pra garantir precedência — não confie na ordem das
classes. Isso não é um problema em componentes que não usam `variant` (`Chip`,
`AbaAtivosArquivados`), só em cima do `Button` do shadcn.

### Armadilha conhecida — atributo `hidden` perde pra classe `flex`/`grid`/`block`

Qualquer elemento com o atributo HTML `hidden` (ex.: o `TabsContent` inativo do Radix, que usa
`hidden` pra esconder a aba não selecionada) **e também** uma classe de display do Tailwind
(`flex`, `grid`, `block`, etc.) fica com o `display` da classe vencendo, não o `display: none` do
`hidden` — porque `@tailwind utilities` é injetado depois de `@tailwind base` no CSS gerado, e as
duas regras têm a mesma especificidade, então quem vem por último no cascade ganha. O elemento
"escondido" continua ocupando espaço no layout normalmente (só fica com conteúdo vazio + a própria
margem/gap dele). Foi exatamente a causa de um bug real: no Dashboard, a aba Financeiro tinha um
espaço quase duas vezes maior acima do primeiro card do que a aba Comunicação, porque o
`TabsContent` de Comunicação (inativo, `hidden`, mas com `flex flex-col gap-6` na classe) continuava
renderizado no fluxo, empurrando o conteúdo de Financeiro pra baixo. Corrigido globalmente em
`src/app/globals.css` com `[hidden] { display: none !important; }` — não precisa de mais nada por
componente, mas vale saber a causa se aparecer um espaçamento estranho perto de qualquer
`TabsContent`/conteúdo condicional que usa `hidden` em vez de desmontar.

### Tipografia

| Token | Valor estimado | Confiança | Uso |
|---|---|---|---|
| Família | Inter (via `next/font`) | **estimado, não confirmado** — nenhuma fonte de exibição identificável com confiança nas capturas | Padrão do app inteiro |
| Título de página (h1) | `text-2xl font-bold text-foreground sm:text-3xl` | **implementado, não mais estimado** — ver regra MANDATÓRIA abaixo | Todo `<h1>` de página, em qualquer rota |
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
| Card principal (Cadastro) | 12px (`rounded-xl`) | implementado | `Card` de listagem de Pessoas |
| Campo de busca | 9px (`rounded-[9px]`) | implementado | `Input` de busca |
| Botão "Baixar contatos" | 10px (`rounded-[10px]`) | implementado | — |
| Chip (seleção múltipla, ex. Aluno/Professor) | 999px / pílula (`rounded-full`) | implementado | `Chip` (`src/components/ui/chip.tsx`) |
| Botão "Filtros avançados" / trilho do segmented control / ícone de linha (olho) / botão "Exportar" | 8px (`rounded-lg`) | implementado | — |
| Botão redondo de ação primária ("+") | 50% / círculo (`rounded-full` num `h-9 w-9`) | implementado | Trigger do modal "Nova pessoa" |
| Checkbox | 5px (`rounded-[5px]`, **não** circular) | implementado | Ver "Checkbox — medida exata" abaixo |
| Botões de paginação | 7px (`rounded-[7px]`) | implementado | — |

**Checkbox — medida exata (corrige um bug retroativo, vale pro app inteiro):** caixa 18×18px,
borda 1.6px na cor `border-strong`, canto `rounded-[5px]`, ícone de check 12×12px (margem visível
entre o check e a borda interna). Antes disso, `Checkbox` usava a classe `rounded-sm`, que neste
projeto mapeia pra `calc(var(--radius) - 4px)` = 8px — numa caixa de 16×16px isso renderizava
quase um círculo. Por isso o checkbox agora usa um radius explícito, independente da escala
`--radius` (que continua servindo bem card/botão/input, só não serve a esse caso pequeno).

### Altura de controles (Cadastro)

| Grupo | Altura | Uso |
|---|---|---|
| Linha "busca/ações" | 36px (`h-9`) | Campo de busca, botão "Baixar contatos", botão redondo "+" |
| Linha "filtros" | 30px (`h-[30px]`) | Chips de papel, botão "Filtros avançados", segmented control |

Deliberadamente duas alturas diferentes — cria hierarquia visual entre "o que eu faço" (linha de
cima) e "como eu filtro" (linha de baixo). Ver candidata a regra MANDATÓRIA na seção de perguntas
em aberto.

### Responsividade

**MANDATÓRIO — o app deve ser responsivo para mobile sempre, em qualquer tela nova ou
existente.** Não é uma decisão em aberto: Katlin (usuária que administra a parte de
Comunicação) usa o app ~90% do tempo pelo celular. Toda implementação de UI — sidebar,
dashboard, formulários, futuras telas de Vagões/Pessoas/Caixa — precisa funcionar bem em
viewport mobile antes de ser considerada pronta, mesmo quando o Figma de referência só
mostrar o layout desktop.

O Figma consultado até agora é desktop-only, então os breakpoints/comportamento mobile
específicos de cada tela ainda são inferidos, não extraídos de um design mobile — mas a
obrigação de funcionar em mobile vale independente de o Figma ter ou não uma versão
mobile desenhada.

Implementado: a sidebar usa o modo mobile nativo do componente `Sidebar` do shadcn/ui
(drawer via `Sheet`, controlado por `SidebarProvider`) — abaixo do breakpoint `md`, o
rail fixo dá lugar a uma barra superior com botão de menu (`SidebarTrigger`) que abre a
sidebar como um drawer.

---

## Inventário de componentes

| Elemento visual | Primitivo shadcn | Wrapper customizado |
|---|---|---|
| Cards de KPI, pendências, ritual | `Card` | `KpiCard`, `PendenciaRow` (dentro de `PendenciasList`) |
| Abas de seção de página (Comunicação/Financeiro, Recebimentos/Repasses) | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` — **variante sublinhada**, não a pill padrão do shadcn (ver regra MANDATÓRIA abaixo) | — |
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
| Dropdowns de seleção única (filtros, formulários) | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` — nunca `<select>` nativo (ver regra MANDATÓRIA abaixo) | — |
| Checkbox (corrigido — quadrado, não circular) | `Checkbox` (`src/components/ui/checkbox.tsx`) | Seleção em massa da listagem de Pessoas, formulários |
| Chip de seleção múltipla (pílula, preenchido quando ativo) | — | `Chip` (`src/components/ui/chip.tsx`) — usado pra papel Aluno/Professor; diferente de `Checkbox`, não é pra seleção em massa de linha |
| Botão "Filtros avançados" (agrupa filtros pouco usados) | `Sheet` (gaveta lateral) + `Button` | `FiltrosAvancadosSheet` |
| Segmented control (Ativos/Arquivados) | — | `AbaAtivosArquivados` (`src/components/`) |
| Botão redondo de ação primária ("+") | `Button size="icon"` + `rounded-full` | Trigger de `NovaPessoaDialog` |
| Exportar contextual (dropdown de ações, disparado do cabeçalho de uma tabela) | `DropdownMenu` | `ExportarDropdown` (`src/app/(protected)/pessoas/`) |
| Trail de navegação acima do `<h1>` de toda página interna | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator` | `PageBreadcrumb` (`src/components/shell/PageBreadcrumb.tsx`) |

Biblioteca de ícones: **lucide-react** (estilo de traço fino consistente com os ícones do
Figma). Nos componentes de Cadastro listados acima, os ícones usam traço mais grosso (2.1–2.6px,
ver regra em "Perguntas e premissas em aberto") — ainda não aplicado retroativamente ao resto do
app.

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
5. **Toda tela e componente novo deve ser responsivo para mobile, sempre** — não é
   opcional e não depende do Figma de referência mostrar ou não uma versão mobile.
   Katlin, principal usuária da parte de Comunicação, acessa o app quase só pelo celular
   (~90% do tempo). Antes de considerar qualquer UI pronta, teste em viewport mobile.
   Ver seção "Responsividade" nos tokens acima para o que já foi implementado (sidebar
   com drawer mobile via `Sidebar`/`Sheet` do shadcn).
   **Corolário — todo `Card`/item dentro de um `grid`/`flex` que exibe número, valor
   monetário ou qualquer texto sem espaço pra quebrar precisa de `min-w-0` no item e
   `break-words` no texto.** Bug corrigido em 2026-08-13: os `KpiCard` do Dashboard
   (`RECEBIDO NO MÊS`, `SALDO VIVO`) vazavam pra fora do card em telas estreitas — item de
   grid, por padrão CSS (`min-width: auto`), nunca encolhe abaixo do tamanho intrínseco do
   próprio conteúdo, mesmo com a coluna do grid configurada como `minmax(0, 1fr)`
   (`grid-cols-N` do Tailwind). "R$ 1.570,00" usa espaço não quebrável entre o `R$` e o
   número (`Intl.NumberFormat`/`toLocaleString`), então sem `break-words` o texto não tem
   onde quebrar e vaza. Ver `KpiCard.tsx`/`FunnelStageCard.tsx` como referência; o board de
   Vagões (`Board.tsx`/`ContatoCard.tsx`) já usava esse padrão corretamente antes desse bug
   ser corrigido em outro lugar — copie de lá também.
6. **Todo título de página (`<h1>`) usa exatamente as classes do `DashboardHeader`**:
   `text-2xl font-bold text-foreground sm:text-3xl`. `DashboardHeader.tsx` é a referência
   canônica — nunca `text-lg`/`font-semibold` (tamanho de subtítulo, usado por engano nas
   primeiras telas do v1 e corrigido) nem cor hardcoded tipo `text-slate-900` (sempre o
   token `text-foreground`, que já se adapta a dark mode). Vale para toda rota nova,
   inclusive fora de `(protected)`, a menos que a tela seja explicitamente um contexto
   visual diferente do shell do app (ex: a marca "OVO" na tela pública de login não é um
   título de página no mesmo sentido).
7. **Toda `Tabs` de seção de página (duas ou mais áreas de conteúdo dentro de uma mesma
   rota, ex: Comunicação/Financeiro no Dashboard, Recebimentos/Repasses no Caixa) usa a
   variante sublinhada do `DashboardHeader`/`HomePage` (`src/app/(protected)/page.tsx`),
   nunca o estilo pill padrão do shadcn (`TabsList` com fundo `bg-muted` e trigger ativo
   virando um "botão" preenchido) — esse estilo default só serve para tabs que são
   controles isolados dentro de um componente menor (ex: categorias dentro do
   `MensagemPickerSheet`), não para navegação entre seções de uma página inteira. Copie
   exatamente:
   ```tsx
   <TabsList className="bg-transparent p-0">
     <TabsTrigger
       value="..."
       className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
     >
       ...
     </TabsTrigger>
     <TabsTrigger
       value="..."
       className="ml-6 rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
     >
       ...
     </TabsTrigger>
   </TabsList>
   ```
   (o `ml-6` é só no segundo trigger em diante, para o espaçamento entre abas — o primeiro
   não leva margem lateral).
   **Sempre que a `Tabs` for especificamente Comunicação/Financeiro (Dashboard, Vagões — e
   qualquer rota nova que reúna essas duas seções), Financeiro vem primeiro, Comunicação
   depois.** Decidido com o Rogério em 2026-08-13. Isso vale só pra esse par específico de abas
   (Comunicação/Financeiro) — não é uma regra geral de ordenação pra outros pares (ex.:
   Recebimentos/Repasses no Caixa mantém sua própria ordem). Como o `ml-6` decora o *segundo*
   trigger renderizado (não um valor fixo por rótulo), ele acompanha a troca: some do trigger
   que virou primeiro e aparece no que virou segundo, condicionado a esse primeiro realmente
   estar sendo renderizado (ex.: Vagões só aplica `ml-6` em "Comunicação" quando `podeVerFinanceiro`
   também for `true` e o trigger "Financeiro" estiver presente).
   **Espaçamento entre a `TabsList` e o conteúdo abaixo dela é sempre `mt-6` (24px)** — nunca
   o `mt-2` default do `TabsContent` do shadcn nem outro valor arbitrário. Quando o conteúdo é
   comum a todas as abas em vez de estar dentro de um `TabsContent` por aba (caso de Vagões,
   onde o `Board` não muda entre Comunicação/Financeiro), o próprio `<Tabs>` leva `mb-6` em vez
   de `mt-6` no conteúdo — mesmo valor, aplicado do outro lado do mesmo espaço. Bug corrigido em
   2026-08-13: Vagões estava com `mb-4` (16px) enquanto Dashboard e Caixa usam `mt-6` (24px) no
   `TabsContent`, um espaçamento visivelmente menor e inconsistente com o resto do app.
   ```tsx
   {/* Conteúdo por aba (Dashboard, Caixa) */}
   <TabsContent value="..." className="mt-6 flex flex-col gap-6">...</TabsContent>

   {/* Conteúdo compartilhado entre abas (Vagões) */}
   <Tabs defaultValue="..." className="mb-6">...</Tabs>
   ```
8. **Todo dropdown de seleção única usa o `Select` do shadcn (`src/components/ui/select.tsx`),
   nunca um `<select>` HTML cru estilizado na mão** — era o padrão em todas as telas do v1
   (Pessoas, Turmas, Matricular, filtro de Vagões, Caixa, Mensagens), e por isso o
   espaçamento entre o texto selecionado e o ícone de chevron ficou apertado em todas ao
   mesmo tempo (o browser controla esse espaço num `<select>` nativo, sem token nenhum).
   `SelectTrigger` já tem `gap-2` embutido entre o valor e o chevron — não remova essa
   classe nem sobreponha com `justify-between` sem `gap`. Copie exatamente:
   ```tsx
   <Select value={valor} onValueChange={setValor} disabled={isPending}>
     <SelectTrigger>
       <SelectValue placeholder="..." />
     </SelectTrigger>
     <SelectContent>
       <SelectItem value="...">...</SelectItem>
     </SelectContent>
   </Select>
   ```
9. **Toda ação destrutiva confirmada (excluir permanentemente, e qualquer outra que vier depois)
   usa `Button variant="destructive"`**, que aponta pro token `--danger`/`--danger-foreground`
   (fundo `#9C0000`, texto `#F9FAFB` — ver tabela de Cor acima). Não crie um estilo de botão de
   perigo paralelo nem sobrescreva a cor via `style`/classe arbitrária num botão específico — o
   token é reusável em qualquer confirmação destrutiva futura.
10. **`Checkbox` (`src/components/ui/checkbox.tsx`) é quadrado, nunca circular**: caixa 18×18px,
    `rounded-[5px]`, borda 1.6px `border-strong`, ícone de check 12×12px. Antes disso, a classe
    `rounded-sm` (que neste projeto mapeia pra `calc(var(--radius) - 4px)` = 8px numa caixa de
    16×16px) fazia o componente renderizar quase circular — bug corrigido retroativamente em
    2026-08-12, vale pro app inteiro, não só onde foi notado (Cadastro/Pessoas). Não reintroduza
    `rounded-sm`/`rounded-md`/`rounded-full` neste componente.
11. **Dois níveis de confirmação para ações que desfazem estado, escolhidos pelo tamanho do
    estrago:**
    - **Leve** (`AlertDialog` simples, só "Cancelar"/confirmar, sem digitar nada) — pra ações
      reversíveis que merecem uma pausa, mas não risco de perda de dado: Arquivar pessoa,
      Encerrar matrícula. Ver `PessoaArquivarButton.tsx`, `MatriculaEncerrarButton.tsx`.
    - **Pesada** (`AlertDialog` exigindo digitar o nome exato) — reservada só pra exclusão
      permanente (irreversível de verdade). Ver `PessoaExcluirButton.tsx`.
    Ações totalmente reversíveis na hora (Desarquivar pessoa, Restaurar matrícula) não precisam
    de nenhuma confirmação — o próprio desfazer já é a rede de segurança.
12. **Toda página interna (dentro do `(protected)`), exceto o próprio Dashboard, usa
    `PageBreadcrumb` (`src/components/shell/PageBreadcrumb.tsx`, sobre o `Breadcrumb` do shadcn)
    imediatamente acima do `<h1>`, sempre começando com `{ label: "Dashboard", href: "/" }`.**
    Decidido com o Rogério em 2026-08-13, revisto no mesmo dia — **revoga a versão anterior desta
    regra**, que dizia "nunca repete Dashboard" e isentava página de nível único (Vagões, Caixa)
    de ter breadcrumb. Na prática isso deixava metade das páginas sem nenhum breadcrumb, o que
    pareceu mais inconsistente do que o "Dashboard" repetido no início de todo trail. Regras do
    trail agora:
    - **Sempre começa com `{ label: "Dashboard", href: "/" }`** — inclusive em página de nível
      único na sidebar (Vagões, Caixa), que agora leva um trail de 2 itens
      (`Dashboard → Vagões`) em vez de nenhum.
    - Página dentro de um grupo da sidebar sem rota própria (Cadastro → Pessoas/Turmas,
      Configurações → Mensagens) usa o rótulo do grupo como item do meio, **sem `href`** (texto
      simples, não clicável — não existe `/cadastro` nem `/configuracoes` como rota). Controle de
      acessos e Sincronizar com a Wix também usam "Configurações" nessa posição por pertencerem
      ao mesmo grupo conceitual, mesmo ainda não linkados na sidebar (ver "Perguntas e premissas
      em aberto").
    - Rota aninhada (`/pessoas/[id]`, `/pessoas/importar`) inclui o nível intermediário como link
      de volta (`{ label: "Pessoas", href: "/pessoas" }`) antes do item atual — isso substitui
      qualquer link manual de "← Voltar para X" que a página tivesse antes.
    - Único caso sem `PageBreadcrumb`: o próprio Dashboard (`/`), por ser a raiz — um trail de um
      item só ("Dashboard") repetiria o `<h1>` logo abaixo.
    Copie exatamente (exemplo de rota aninhada):
    ```tsx
    <PageBreadcrumb
      items={[
        { label: "Dashboard", href: "/" },
        { label: "Cadastro" },
        { label: "Pessoas", href: "/pessoas" },
        { label: pessoa.nome },
      ]}
    />
    ```
13. **`AbaAtivosArquivados` (segmented control Ativos/Arquivados) é sempre alinhado à esquerda**,
    igual em toda página que o usa (Pessoas, Turmas) — nunca `flex justify-end`. Bug corrigido em
    2026-08-13: a página de Turmas envolvia o componente num `<div className="mb-4 flex
    justify-end">`, jogando-o pra direita, enquanto Pessoas usa só `<div className="mb-6">`
    (alinhamento natural à esquerda; o valor de margem passou de `mb-4` pra `mb-6` na
    padronização de ritmo vertical — ver regra 16). Copie exatamente:
    ```tsx
    <div className="mb-6">
      <AbaAtivosArquivados />
    </div>
    ```
14. **Rótulo de `Card`/item avulso (KPI, contador) nunca usa `uppercase`/`tracking-wide` — texto
    normal (ex.: "Recebido no mês", "Pessoas"), nunca caixa alta ("RECEBIDO NO MÊS").** Decidido
    com o Rogério em 2026-08-13. As strings de label nesses casos já vinham em texto normal no
    código (`core/dashboard/consultas.ts`, `WixSyncPanel.tsx`) — quem forçava caixa alta era só a
    classe `uppercase` (+ `tracking-wide`, que só faz sentido acompanhando `uppercase`); os dois
    saíram juntos. Ver `KpiCard.tsx`/`WixSyncPanel.tsx` (`Contagem`) como referência.
    **Cabeçalho de tabela (`<thead>`) é o oposto — continua sempre `uppercase tracking-wide`,
    de propósito**: é o padrão consistente hoje em toda tabela do app (Pessoas, Turmas,
    Importar, Pessoa detalhe, Mensagens, Admin/Usuários, Caixa Recebimentos/Repasses) e não deve
    ser alterado nem por engano nem por analogia com a regra dos cards acima — são contextos
    diferentes (rótulo de valor destacado vs. cabeçalho denso de coluna). Copie exatamente:
    ```tsx
    {/* Card/contador — sem uppercase */}
    <p className="text-xs font-medium text-muted-foreground">{label}</p>

    {/* Cabeçalho de tabela — com uppercase */}
    <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
    ```
15. **Toda página interna segue a mesma ordem de header: Breadcrumb → H1+busca+CTA → Tabs →
    Filtros → Conteúdo.** Decidido com o Rogério em 2026-08-13. Existia como convenção implícita
    desde a página de Pessoas (`PessoasListagem.tsx`), replicada em Turmas por analogia, mas nunca
    tinha sido escrita — o que já causou divergência real (filtro na linha do H1 em Vagões, CTA
    fora de lugar em Caixa, quatro espaçamentos diferentes pro wrapper do H1 entre páginas). A
    ordem, de cima pra baixo:
    1. `PageBreadcrumb` — regra 12 acima, sem mudança (sempre presente, exceto no Dashboard).
    2. Bloco H1 — só o `<h1>` (regra 6), **sem subtítulo estático abaixo** (ver regra 17); coluna
       direita com `CopilotoInput` (busca — só em páginas de listagem/navegação, não em fluxos de
       ação única tipo Importar CSV ou Sincronizar Wix) e o(s) CTA(s) (`Dialog`/`Button`). Copie
       exatamente:
       ```tsx
       <div className="mb-6 mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
         <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Título</h1>
         <CopilotoInput />
         <NovaCoisaDialog />
       </div>
       ```
       **Sem CTA, a busca fica centralizada de verdade, não só espremida pelo `justify-between`.**
       Decidido com o Rogério em 2026-08-13 — caso de hoje: Dashboard (`DashboardHeader.tsx`), que
       tem `CopilotoInput` mas nenhum `Dialog` de CTA, só a data por extenso do lado direito.
       `justify-between` sozinho não centraliza a busca de verdade quando os itens das pontas têm
       larguras diferentes (título vs. texto da data) — a correção é dar `sm:flex-1` pros dois
       itens das pontas (mesmo quando um deles não é um CTA, é só texto/decorativo), sem
       `sm:justify-between`, pra que sobre o mesmo espaço dos dois lados e a busca fique
       exatamente no centro. Copie exatamente:
       ```tsx
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
         <h1 className="text-2xl font-bold text-foreground sm:flex-1 sm:text-3xl">Título</h1>
         <CopilotoInput />
         <p className="shrink-0 text-sm text-muted-foreground sm:flex-1 sm:text-right">Texto do lado direito, se houver.</p>
       </div>
       ```
    3. Tabs — regra 7 acima, sem mudança (variante sublinhada, `mt-6`/`mb-6`).
    4. Filtros — **sempre depois das tabs, nunca na linha do H1**, wrapper
       `<div className="mb-6 flex flex-wrap items-center gap-3">` imediatamente acima do
       conteúdo (tabela/board/lista).
    5. Conteúdo.

    **Caso Caixa — CTA que depende da aba ativa:** `NovoRecebimentoDialog`/`NovoRepasseDialog`
    ficam no bloco do H1 (item 2), não dentro do `TabsContent` — mas qual dos dois aparece depende
    de qual aba (Recebimentos/Repasses) está ativa. Como o H1 é renderizado pelo Server Component
    `page.tsx` e a aba ativa antes vivia só como estado local dentro do Client Component
    `CaixaTabs`, a aba passou a ser controlada pelo searchParam `aba` (mesmo padrão de
    `AbaAtivosArquivados`/Ativos-Arquivados) — `page.tsx` lê `searchParams.aba` pra decidir qual
    CTA renderizar, e `CaixaTabs` vira `<Tabs value={aba} onValueChange={...}>` sincronizado com a
    mesma URL. Precisa de `export const dynamic = "force-dynamic"` em `page.tsx` (mesma causa raiz
    documentada em `pessoas/turmas/page.tsx`: trocar searchParam sem isso pode servir cache do
    Router do Next). O resumo de KPIs (`KpiCardsGrid`) é compartilhado pelas duas abas (não muda
    com a aba ativa) — por isso fica dentro de `CaixaTabs`, logo abaixo da `TabsList` e fora de
    qualquer `TabsContent` (senão sumiria ao trocar de aba), não no bloco do H1.

    **Fora da regra:** páginas de detalhe/edição (ex.: `Pessoas/[id]`) são um arquétipo
    diferente — mantêm `PageBreadcrumb`+`h1` como já estão, sem forçar busca/CTA/tabs/filtro que
    não fazem sentido nesse contexto.
16. **Todo espaçamento vertical estrutural da cadeia Breadcrumb → H1 → Tabs → Filtros → Conteúdo
    usa `mb-6`/`mt-6` (24px), nunca `mb-4` (16px).** Decidido com o Rogério em 2026-08-13 — antes
    disso o Dashboard (`page.tsx`, `gap-6` entre `DashboardHeader` e as Tabs) já usava 24px
    enquanto Pessoas/Turmas/Vagões usavam `mb-4` (16px) entre H1/`AbaAtivosArquivados`/filtro,
    criando um ritmo vertical raso e inconsistente bem na página de referência. Vale
    especificamente para:
    - Wrapper do bloco H1 (item 2 da regra 15): `mb-6 mt-2` (o `mt-2` do breadcrumb pro H1
      continua pequeno de propósito — é uma relação "elemento pequeno + título", não uma
      separação de seção).
    - Wrapper de `AbaAtivosArquivados` (regra 13): `mb-6`.
    - Wrapper de Tabs quando não usa `TabsContent` (ex.: Vagões, só `TabsList`): `mb-6`.
    - Wrapper de filtros (item 4 da regra 15): `mb-6`.
    Não muda: o `gap-4` horizontal dentro do bloco H1 (entre título/busca/CTA), o `gap-3` dentro
    da própria barra de filtros (entre chips), o `mt-6` de `TabsContent` (regra 7, já estava
    certo) e o `p-4` de padding interno de `Card`/`CardContent` — nenhum desses é um "gap entre
    seções" da cadeia, são espaçamentos internos de um bloco só.
17. **Nenhuma página usa texto de descrição estático abaixo do `<h1>`.** Decidido com o Rogério em
    2026-08-13 — existia em Caixa, Biblioteca de mensagens, Controle de acessos, Importar Pessoas
    e Sincronizar com a Wix (`<p className="text-sm text-muted-foreground">` logo abaixo do
    título, ex.: "Recebimentos e repasses financeiros da escola."), removido de todas. O título
    já basta; se o texto carregava alguma informação de segurança/contexto relevante (ex.: o aviso
    "somente leitura" de Sincronizar com a Wix), essa informação deve migrar pra dentro do próprio
    conteúdo da página (painel, formulário), não ficar solta como subtítulo do header.
    **Não confundir com texto de status dinâmico** (ex.: "3 selecionadas" no header de Pessoas
    quando há seleção em massa, `PessoasListagem.tsx`) — isso é feedback funcional de uma ação em
    andamento, não uma descrição decorativa fixa, e continua permitido.
18. **Badge de status dentro de tabela sempre usa cor indicativa — verde, amarelo, vermelho ou
    azul — nunca cinza `bg-secondary` genérico.** Decidido com o Rogério em 2026-08-13. Antes
    disso, a maioria desses badges (Recebimento, Repasse, Matrícula, papel de usuário) usava o
    mesmo cinza `bg-secondary`/`text-secondary-foreground` pra todo estado, sem diferenciação
    visual — só `StatusBadge` (`statusAluno`/`statusProfessor`) já tinha cor. Semântica das 4
    cores (mesmo par `bg-*-100`/`text-*-800` do Tailwind em toda parte, igual ao que já existia
    pra `matriculado`/`lead`):
    - **Verde** (`bg-emerald-100 text-emerald-800`) — estado positivo, em curso ou concluído com
      sucesso: `matriculado`, `ativo` (aluno/professor), `confirmado` (Recebimento), `pago`
      (Repasse), `ativa` (Matrícula), "Pronta" (linha de importação sem erro).
    - **Amarelo** (`bg-amber-100 text-amber-800`) — aguardando/pendente, precisa de atenção mas
      não é um erro: `lead`, `banco_talentos` (o par "ainda não vinculado" de aluno/professor),
      `pendente` (Recebimento e Repasse), `pendente` (acesso de usuário ainda não liberado),
      "Possível duplicata" (linha de importação).
    - **Vermelho** (`bg-red-100 text-red-800`) — negativo, cancelado ou erro: `cancelado`
      (Recebimento), erro de validação de linha de importação. Deliberadamente **não** usa o
      token `--destructive`/`Button variant="destructive"` da regra 9 — aquele é reservado pra
      botão de ação destrutiva, não pra badge informativo; misturar os dois sugeriria que o badge
      é clicável.
    - **Azul** (`bg-blue-100 text-blue-800`) — neutro-categórico: nem positivo nem negativo, só
      uma classificação ou um estado "encerrado" sem ter sido um problema: papel concedido de
      usuário (`admin`/`financeiro`/`comunicacao`/`educador` — categórico, todos equivalentes em
      "polaridade"), `encerrada` (Matrícula — terminou o curso, não é uma falha), Turma arquivada
      na ficha do professor.
    Forma do badge — copie exatamente (mesmo padrão em toda a tabela, `StatusBadge.tsx` como
    componente compartilhado pra `statusAluno`/`statusProfessor`, `*_CORES` local em `Record<string,
    string>` nos demais por não compartilharem o mesmo vocabulário de estados):
    ```tsx
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CORES[valor] ?? "bg-secondary text-secondary-foreground"}`}>
      {LABELS[valor]}
    </span>
    ```
    **Fora da regra:** badge que não representa um *status* (estado que muda ao longo do tempo),
    e sim uma origem/categoria/tag — quando existir um caso assim, não leva cor semântica
    (`bg-secondary`), porque não há um segundo valor pra contrastar. Exemplo já removido: a
    tabela de Turmas (`pessoas/turmas/page.tsx`) tinha um badge "Origem: Wix" dentro da célula do
    nome — tirado em 2026-08-13 porque carregava baixo sinal (aparecia em quase toda turma, já
    que toda turma nova sempre vem da Wix) e ainda poluía visualmente a coluna que acabara de ser
    limpa nesta mesma leva de mudanças (ver regra 15 sobre nome de Turma). Se precisar checar a
    origem de uma turma específica, `wixProductId`/`origem` continuam no documento, só não têm
    mais representação na listagem.
19. **Preferir token reutilizável a valor hardcoded, sempre que der.** Pedido pelo Rogério em
    2026-08-13 como regra geral — **não é retroativa**: código já existente com valor hardcoded
    (ex.: as classes `slate-*` de `admin/usuarios/page.tsx`, item 9 de "Perguntas e premissas em
    aberto"; as próprias classes de cor da regra 18, hoje literais repetidas por arquivo) pode ser
    corrigido depois, quando alguém mexer naquele código por outro motivo — mas todo código
    **novo**, a partir de agora, já nasce seguindo esta regra. Generaliza a regra 4 (que já dizia
    "não crie um segundo sistema de tokens, a menos que nenhum slot exista") pra um princípio mais
    amplo, em duas camadas:
    - **Primeiro, tente um token/slot que já existe** — `--background`, `--foreground`,
      `--border`, `--muted-foreground`, `--secondary`, `--destructive`, etc. (ver tabela "Cor" no
      topo deste arquivo) — em vez de uma cor Tailwind literal (`slate-500`, `emerald-100`) ou um
      hex arbitrário. Mesma lógica fora de cor: prefira a escala padrão do Tailwind (`text-sm`,
      `rounded-md`, `gap-4`) a um valor arbitrário (`text-[13px]`, `rounded-[9px]`) — só use
      arbitrário quando o design pede uma medida específica que a escala não cobre (ver
      "Checkbox — medida exata" nos tokens acima, que é um caso legítimo disso).
    - **Se não existe slot que sirva** (caso da regra 18: não há um "sucesso"/"atenção"/"erro"/
      "informação" pronto no shadcn), o token novo entra do jeito que a regra 4 já manda —
      variável CSS em `globals.css` + `tailwind.config.ts`, definida **uma vez só** — em vez de
      repetir a mesma combinação de classes literal (`bg-emerald-100 text-emerald-800`) em vários
      arquivos. Repetir a mesma classe em N arquivos não é "usar Tailwind", é hardcoding
      disfarçado: se o tom precisar mudar depois, tem que caçar em todo arquivo em vez de mudar
      uma variável só. Sinal de que chegou a hora de virar token de verdade: a mesma combinação de
      classes aparecendo em 2+ arquivos com o mesmo significado.

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
5. **Candidata a regra MANDATÓRIA, ainda não confirmada com o Rogério**: as duas alturas de
   controle da barra de Pessoas (36px "o que eu faço" / 30px "como eu filtro", ver "Altura de
   controles" nos tokens acima) e o princípio geral de "cada família de componente tem seu
   próprio tom, não só sua própria forma" (ex.: `border` leve pra divisórias vs. `border-strong`
   pra controles interativos). Proposto no "Prompt de implementação — Cadastro" de 2026-08-12 —
   sinalizar pro Rogério antes de tratar como regra fixa de todo o app.
6. **Backlog de auditoria**: Dashboard, Vagões e Caixa provavelmente têm a mesma inconsistência
   de altura/raio/tom que a listagem de Pessoas tinha antes do ajuste de 2026-08-12 (controles
   com alturas/raios variados sem hierarquia deliberada). Não foi tocado nesta tarefa — só
   registrado aqui pra alguém auditar depois.
7. O "Prompt de implementação — Cadastro (Pessoas & Turmas)" de 2026-08-12 menciona dois anexos
   (`wireframe-pessoas-ajustado.html`, `teste-importacao-contatos.csv`) que não chegaram a entrar
   no repositório nem foram enviados na conversa — a implementação do formato de importação CSV
   (papel duplo `A&P`, múltiplas turmas por linha) não foi validada contra o arquivo de teste
   mencionado.
8. **`/admin/usuarios` (Controle de acessos) e `/admin/wix-sync` (Sincronizar com a Wix) ainda não
   têm link na sidebar** — só acessíveis por URL direta. `Configurações` na sidebar hoje só expande
   pra "Mensagens" (adicionado em 2026-08-13). Se/quando essas duas telas entrarem no menu, seus
   `PageBreadcrumb` já usam "Configurações" como primeiro item — só falta o item em `NAV_ITEMS`
   (`src/components/shell/AppSidebar.tsx`).
9. **`/admin/usuarios` tem a tabela inteira em cores hardcoded** (`border-slate-200`, `bg-white`,
   `bg-slate-50`, `text-slate-900`, `text-slate-500` — só o header da página foi migrado pra
   tokens na padronização de 2026-08-13, regra 15) em vez de `border-border`/`bg-card`/
   `text-foreground`/`text-muted-foreground`, usados no resto do app. Página claramente anterior
   à padronização de tokens — fica como pendência de migração, não foi tocada além do header.
