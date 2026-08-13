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
