# OVO (Trilho) — Constitution
### v0.1 — fundamentos compartilhados entre financeiro e comunicação

## Papel deste documento

Este é o documento raiz do projeto. Ele define as decisões que **não podem ser
tomadas de novo, de forma diferente, em cada spec vertical** (financeiro,
comunicação, e futuras). Toda spec de funcionalidade referencia este arquivo
em vez de duplicar essas decisões — se uma spec parece contradizer o que está
aqui, a spec está desatualizada ou a decisão precisa ser revista neste nível
antes de seguir.

Documentos que dependem deste: `specs/financeiro/financeiro-overview.md`,
`specs/financeiro/spec-caixa.md`, `specs/financeiro/spec-vagoes-financeiro.md`,
e a futura `specs/comunicacao/comunicacao-overview.md`.

---

## 1. Contexto do produto

A OVO é uma escola de artes gerida por duas pessoas com papéis distintos:
Camila (financeiro) e Katlin (comunicação). O produto tem dois módulos com
públicos, dados e níveis de sensibilidade diferentes, mas compartilha a base
de entidades (pessoas, cursos/turmas, matrículas). Não é dois produtos —
é um produto com dois módulos que não devem duplicar cadastro nem regra
de acesso.

## 2. Stack técnica

### Frontend
- **React** + **TypeScript** (sem `any`, sem tipos implícitos — tipagem explícita
  sempre que a intenção não for óbvia pela inferência).
- **Next.js** como framework de aplicação (roteamento, SSR/RSC onde fizer sentido,
  API routes apenas como fachada fina — regra de negócio não vive em rota).
- **Atomic Design** como padrão de organização de componentes: `atoms → molecules
  → organisms → templates → pages`. Nenhum componente ultrapassa a responsabilidade
  do seu nível. Props sempre tipadas com `interface` dedicada por componente.

### Backend
- **Firebase** como banco de dados principal (Firestore) — fonte de verdade para
  entidades do domínio (pessoas, cursos/turmas, matrículas, cobranças, repasses).
- **API REST** como camada de acesso aos dados — o frontend nunca acessa o Firestore
  diretamente para dados sensíveis (financeiro); toda leitura/escrita financeira
  passa pela API, que aplica autorização antes de tocar no banco.
- **Google Calendar API** — integração para agendamento/eventos (módulo de
  comunicação, principalmente).
- **Gemini API** — recursos de IA/copiloto. Camada de inteligência é a última da
  hierarquia de domínio (ver `specs/financeiro/financeiro-overview.md` §3) — só
  entra depois que as camadas de base/operação/ritual estiverem confiáveis.
  Nenhum dado financeiro sensível deve ser enviado a modelos externos (incluindo
  Gemini) sem anonimização/agregação — ver §5.3.

### Autenticação e sessão
- Autenticação via Firebase Auth. Toda rota de API valida token + papel (role)
  antes de qualquer leitura/escrita.
- Roles mínimas do sistema: `admin`, `financeiro` (Camila, contadora), `comunicacao`
  (Katlin e equipe), `educador` (acesso restrito ao próprio repasse/agenda, quando
  aplicável). Novas roles exigem atualização deste documento antes de ser
  implementadas em qualquer módulo.

## 3. Arquitetura

### Camadas (Clean Architecture / SOLID)
O backend (API REST) segue separação em camadas, cada uma dependendo apenas da
camada mais interna, nunca o contrário:

1. **Domain** — entidades e regras de negócio puras (ex.: `Cobranca`, `Repasse`,
   `Matricula`), sem dependência de framework, Firebase ou HTTP.
2. **Application** (use cases) — orquestra regras de domínio para resolver um
   cenário específico (ex.: `ConciliarRecebimento`, `FecharMes`). Depende de
   `Domain` e de interfaces (portas), nunca de implementações concretas.
3. **Infrastructure** — implementações concretas das portas: repositórios Firestore,
   clients de Google Calendar/Gemini, adapters de autenticação. Depende de
   `Application`/`Domain`, nunca o inverso.
4. **Interface/API** — rotas REST (Next.js API routes ou handlers dedicados),
   validação de payload de entrada, serialização de resposta, autorização.
   É a única camada que conhece HTTP.

Princípios SOLID aplicados de forma prática: interfaces pequenas e específicas por
porta (ISP), inversão de dependência entre `Application` e `Infrastructure` (DIP),
uma responsabilidade por use case (SRP). Não introduzir abstração para caso
hipotético — três casos concretos justificam uma interface, um caso não.

### Frontend
Segue Atomic Design (ver §2). Estado de domínio financeiro nunca fica em
componente compartilhado com comunicação — módulos são isolados no frontend
mesmo compartilhando design system.

### Regra de eliminação de código morto
**Sempre que uma parte do código for refatorada, a versão obsoleta DEVE ser
excluída na mesma mudança — nunca deixada comentada, duplicada ou "por garantia".**
Isso vale para funções, componentes, rotas, tipos, feature flags temporárias e
arquivos inteiros que a refatoração tornou não utilizados. Não usar comentários
tipo `// removido` ou reexports de compatibilidade "só por via das dúvidas".
Se há dúvida sobre uso externo ao repo, confirmar com busca no código antes de
decidir manter — não manter por padrão.

## 4. Modelo de dados compartilhado

Entidades abaixo são canônicas e vivem uma única vez no domínio — nenhuma spec
vertical (financeiro ou comunicação) recria cadastro próprio para elas.

| Entidade | Descrição | Módulos que a leem |
|---|---|---|
| Pessoa | Cadastro único de aluno/responsável/educador. | Financeiro, Comunicação |
| Curso/Turma | Oferta específica de um curso, com vagas, período, educador. | Financeiro, Comunicação |
| Matrícula | Vínculo entre Pessoa e Curso/Turma, com status. | Financeiro, Comunicação |

Cada módulo pode ter **campos/entidades específicas** que estendem essas (ex.:
card financeiro no perfil da Pessoa — ver `financeiro-overview.md` §4), mas a
identidade e o cadastro base são únicos.

## 5. Permissões e segurança

### 5.1 Visibilidade por módulo
- Dados financeiros (cobranças, repasses, saldo, retirada) são visíveis **apenas**
  para papéis `admin` e `financeiro` (Camila, contadora). Nenhuma tela, endpoint
  ou payload de outro módulo deve incluir esses dados, mesmo de forma agregada,
  sem checagem explícita de role.
- Dados de comunicação seguem role `comunicacao`/`admin` — a definir em spec própria.

### 5.2 Autorização em profundidade
- Autorização é responsabilidade da camada **Interface/API** (§3), verificada antes
  de qualquer chamada a `Application`. Nunca depender apenas de esconder um botão
  ou rota no frontend — toda proteção de UI é conveniência, não segurança.

### 5.3 Dados críticos fora do payload
- Payloads de resposta da API **nunca** incluem dados financeiros críticos além
  do estritamente necessário para a tela que os solicitou. Exemplos do que não
  deve trafegar sem necessidade explícita: dados bancários completos, documentos
  fiscais, valor de retirada pessoal da Camila em endpoints não-financeiros.
  Endpoints que servem múltiplos papéis (ex.: perfil de Pessoa) retornam uma
  serialização mínima por role — o card financeiro (`financeiro-overview.md` §2,
  item 3) só é incluído na resposta se o solicitante tiver role `financeiro`/`admin`,
  nunca filtrado apenas no cliente.
- Nenhum dado financeiro identificável (nome + valor) é enviado a serviços
  externos de IA (Gemini) sem antes passar por agregação/anonimização — reforça
  a regra de "Inteligência" como última camada (§2, Gemini).
- Toda informação numérica exibida ao usuário mostra origem e confiabilidade
  (Wix vs. registro manual) — princípio já validado com a Camila, herdado por
  qualquer spec financeira.

## 6. Módulos do produto

| Módulo | Papel | Specs |
|---|---|---|
| Financeiro | Reconcilia Wix/banco/e-mail em base confiável de cobranças, repasses e caixa. Não processa pagamento. | `specs/financeiro/financeiro-overview.md` e specs filhas |
| Comunicação | A especificar — gerencia relacionamento com alunos/famílias, agenda (Google Calendar), comunicação institucional. | `specs/comunicacao/` — **placeholder, spec funcional ainda não escrita** |

Comunicação compartilha as entidades do §4 e as regras de autenticação/segurança
deste documento. Até a spec de comunicação existir, nenhuma decisão de escopo
funcional desse módulo deve ser assumida — apenas a infraestrutura compartilhada
(auth, Google Calendar client, design system) pode ser preparada com antecedência.

## 7. O que ainda não está decidido neste nível

- Formato exato de erro/contrato de resposta da API REST (envelope padrão,
  paginação) — definir antes de implementar o segundo endpoint, não antes do
  primeiro.
- Se `educador` é role real desde o MVP financeiro (Vagões prevê repasse a
  educadores) ou se, no início, toda ação de repasse é feita só pela Camila
  sem o educador ter login — impacta RF-08 de `spec-vagoes-financeiro.md`.
- Estratégia de deploy/hosting (Firebase Hosting, Vercel, outro) — não bloqueia
  início do desenvolvimento local.

Essas pendências não bloqueiam começar pelo módulo financeiro (Vagões e Caixa),
que é o que tem specs validadas até aqui.
