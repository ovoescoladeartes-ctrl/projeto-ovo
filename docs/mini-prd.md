# Trilho (OVO) — Mini PRD

**Escopo deste documento:** o v1. Tudo que ficou de fora está priorizado ao final, em fases.

---

## Problem statement

Camila e Katlin gerenciam a OVO com informação espalhada entre Wix, banco, e-mail, Excel e
WhatsApp — e gastam a maior parte do tempo de gestão reconstruindo o que já aconteceu.
O Trilho dá a elas um lugar único onde o estado atual da escola está registrado e visível.

## Success criteria (MVP)

1. **Camila passa um mês fechado sem abrir o Excel.** Se ela voltar pra planilha pra conferir
   qualquer coisa, o Caixa falhou.
2. **Katlin consegue dizer, em menos de 5 segundos e sem clicar, quem está esperando resposta
   há mais tempo.** O board tem que responder isso na primeira olhada.
3. **O ritual se sustenta por 3 semanas seguidas sem lembrete externo.** Este é o critério
   mais difícil e o único que realmente prova a hipótese do produto.

## Main flow (happy path)

### Fluxo A — Ritual financeiro (Camila, semanal)

1. Camila abre o Trilho → tela Caixa.
2. Vê no topo: saldo vivo, recebido no mês, repasses pendentes.
3. Clica em "registrar recebimento" → escolhe a pessoa (busca no cadastro existente),
   a turma, o valor, a forma de pagamento e a **origem** (Wix / manual).
4. Vai na aba de repasses → marca como pago os que já saíram do banco.
5. Volta ao topo: o saldo vivo já refletiu tudo.

### Fluxo B — Ritual de comunicação (Katlin, 3x ao dia)

1. Chega uma mensagem no WhatsApp/Instagram.
2. Katlin abre Novo Contato → 3 campos: nome, canal, o que perguntou. Salva. **Fim do registro.**
3. Mais tarde, abre o board de Vagões. Os cards mais antigos sem resposta estão no topo,
   destacados por cor.
4. Abre um card → copia a resposta pronta da Biblioteca → cola no WhatsApp.
5. Arrasta o card para o próximo estágio (novo → em conversa → experimental → convertido).

### Ponto de encontro dos dois fluxos

Quando um contato vira **convertido**, ele já é uma Pessoa no sistema. Camila registra o
primeiro recebimento dessa mesma Pessoa — sem recadastrar nada. Esse é o único acoplamento
entre os módulos no v1, e é intencional.

---

## Backlog (MoSCoW)

### Must have (v1)

**Base compartilhada**
- [ ] Entidade Pessoa (CRUD) com tipo `aluno` | `colaborador` e status por tipo
      (aluno: Lead / Matriculado · colaborador: Ativo / Banco de talentos)
- [ ] Entidade Curso/Turma com valores (mensalidade, repasse) e datas
- [ ] Entidade Matrícula ligando Pessoa ↔ Curso/Turma
- [ ] Inativação em vez de exclusão em todas as entidades (regra §4 do overview)
- [ ] Campo `origem` (Wix / manual) em todo registro de dado financeiro

**Financeiro (camadas base + operação)**
- [ ] Tela Caixa com cabeçalho: saldo vivo, recebido no mês, repasses pendentes
- [ ] Registro manual de recebimento (pessoa, turma, valor, forma de pagamento, origem, status)
- [ ] Registro manual de repasse (destino, papel/turma, valor, vencimento, status)
- [ ] Marcar repasse como pago
- [ ] Histórico navegável de recebimentos e repasses
- [ ] Restrição de acesso: financeiro visível só para o perfil de Camila

**Comunicação (camadas base + operação)**
- [ ] Fluxo de Novo Contato em 3 passos (nome, canal, o que perguntou) — desacoplado da resposta
- [ ] Board de Vagões com os 5 estágios do funil
- [ ] Cálculo e exibição de urgência por tempo desde a última mudança de status —
      **visível sem clique** (cor + ordenação)
- [ ] Biblioteca de Mensagens: categorias (duração, valor, nível, faixa etária) + ação copiar
- [ ] Mudança de estágio arrastando ou por ação direta no card

### Should have (v1, se couber sem atrasar)

- [ ] Encerrar/arquivar contato (move para lista separada, não apaga)
- [ ] Busca e filtro na lista de Pessoas
- [ ] Filtro por turma no Caixa
- [ ] Categoria financeira nas saídas (educador, espaço, material, imposto, remuneração)
- [ ] Registro de contato já vinculado a uma Pessoa existente (reengajamento)

### Won't have (v1 — ver fases abaixo)

- [ ] Copiloto, em qualquer módulo
- [ ] Qualquer dashboard ou indicador agregado
- [ ] Checklist e calendário
- [ ] Integração com Wix, Pagar.me, banco, WhatsApp, Instagram ou e-mail
- [ ] Exportação para contadora
- [ ] Vagões financeiro (a visão de pipeline do dinheiro — o Caixa já cobre o dado no v1)
- [ ] Configurações: campos custom e valores por turma editáveis pela usuária
- [ ] Multiusuário real, permissões granulares, convite de novos membros

---

## Open questions

1. **O ritual manual se sustenta?** É a pergunta que decide o produto. Precisa ser medida em
   uso real por pelo menos 3 semanas, não perguntada em reunião.
2. **O que é exatamente "saldo vivo"?** O `spec-caixa.md` define como "confirmado menos saídas
   já pagas", mas o valor retido no Wix entra como quê — projeção separada ou nada? Precisa
   ser resolvido antes de codar o cabeçalho do Caixa.
3. **Onde ficam os dois módulos?** Uma app com duas áreas e permissão, ou duas apps? Afeta a
   arquitetura desde o primeiro commit.
4. **A urgência conta desde a última mudança de status ou desde a última mensagem recebida?**
   São coisas diferentes e a Katlin provavelmente pensa na segunda.
5. **Quem popula a base inicial de Pessoas?** Se Camila e Katlin tiverem que cadastrar 80
   alunos à mão antes de usar, o produto morre na semana 1. Precisa de import ou de uma
   estratégia de cadastro incremental.

---

## Suggested first session prompt

> Vou construir o **Trilho**, uma ferramenta de gestão para a escola de artes OVO. Colei
> junto o `context.md` com o contexto completo do produto e o `mini-prd.md` com o escopo do v1.
>
> Quero começar pela **base compartilhada**, porque os dois módulos dependem dela: as entidades
> Pessoa, Curso/Turma e Matrícula, com a regra de que nada é apagado (só inativado) e de que
> todo dado financeiro carrega o campo `origem` (Wix ou manual).
>
> Antes de escrever código, me ajude a:
> 1. Definir o schema dessas três entidades, incluindo os status por tipo de pessoa.
> 2. Decidir se financeiro e comunicação vivem na mesma aplicação com permissão por perfil,
>    ou em aplicações separadas — me apresente o trade-off, não escolha por mim.
> 3. Propor uma estratégia de cadastro inicial que não exija que a usuária cadastre 80 alunos
>    de uma vez.
>
> Depois disso partimos para a tela Caixa (fluxo financeiro) e o Novo Contato + board de
> Vagões (fluxo de comunicação). Não construa nada dos módulos antes da base estar pronta —
> essa hierarquia de camadas é uma regra do produto, não uma preferência.

---

## O que ficou fora do v1 — priorização e fases

A ordem abaixo segue a hierarquia de camadas definida no próprio produto
(base → operação → **ritual → visibilidade → inteligência**). Cada fase só começa quando a
anterior está confiável no uso real, não quando está "pronta".

### v2 — Ritual (camada 3)
*Objetivo: transformar uso esporádico em hábito. Só faz sentido se o v1 já provou que o registro acontece.*

| Prioridade | Item | Por quê agora |
|---|---|---|
| 1 | **Checklist personalizável** | É o mecanismo que sustenta o ritual — os três horários da Katlin, a segunda-feira da Camila, o fechamento do mês. Se o v1 revelar abandono, este é o antídoto. |
| 2 | **Encerrar/arquivar contato** (se não entrou no v1) | Sem isso o board vira lixão em ~2 meses e a urgência perde sentido. |
| 3 | **Pendências financeiras acionáveis** | Cobrança falha, nota fiscal faltando, repasse a vencer. Fecha o loop do ritual de segunda. |
| 4 | **Exportação para contadora** | Baixa frequência, mas bloqueante na rotina contábil. Depende de confirmar o formato com a contadora — pendência aberta. |
| 5 | **Configurações: valores por turma e campos custom** | Tira do código o que hoje é hardcoded e devolve autonomia à Camila. |

### v3 — Visibilidade (camada 4)
*Objetivo: responder "como estamos?" sem garimpar. Exige dados confiáveis acumulados — por isso vem depois do ritual.*

| Prioridade | Item | Por quê agora |
|---|---|---|
| 1 | **Dashboard financeiro** | Panorama do mês, ritual de segunda, pendências. Agrega tudo do v1/v2. |
| 2 | **Vagões financeiro** | A visão de pipeline do dinheiro por aluno (venda → retenção no Wix → liberação → repasse → retirada). É outra leitura dos mesmos dados do Caixa. |
| 3 | **Calendário** | Visitas, aula experimental, início/fim de curso, oficinas. Cruza contatos com turmas — só funciona com as duas bases cheias. |
| 4 | **Indicadores de comunicação** | Taxa de conversão por canal, tempo médio de resposta. Precisa de histórico. |

### v4 — Integrações
*Objetivo: matar a entrada manual. Deliberadamente tardio — a integração antes do hábito esconde se o produto é realmente usado.*

| Prioridade | Item | Ressalva |
|---|---|---|
| 1 | **Import de recebimentos do Wix/Pagar.me** | O maior ganho de tempo da Camila. Mantém o campo `origem` — dado importado e dado manual continuam distinguíveis. |
| 2 | **Import da base de alunos** | Resolve o problema de cadastro inicial se ele não for resolvido antes. |
| 3 | **Leitura de WhatsApp/Instagram** | Alto atrito técnico e regulatório. Mesmo aqui, o Trilho **lê e registra — nunca envia**. Essa regra não se flexibiliza por fase. |

### v5 — Inteligência (camada 5)
*Objetivo: consultar em linguagem natural. Último por definição — um copiloto sobre dado incompleto responde errado com confiança, e isso destrói a confiança no produto inteiro.*

| Prioridade | Item |
|---|---|
| 1 | **Copiloto de consulta** ("quem não pagou esse mês?", "quantos alunos tem em pintura?") — reativo e consultivo, compartilhado pelos dois módulos |
| 2 | **Sugestão de resposta** na comunicação, a partir da Biblioteca + histórico do contato |
| 3 | **Automações de ritual** (lembretes, follow-up sugerido de contato parado) |

### Fora do roadmap — não construir

- Envio de mensagem pelo Trilho
- Processamento de pagamento
- Multiescola / produto SaaS genérico para outras escolas
- Hard delete de qualquer registro
