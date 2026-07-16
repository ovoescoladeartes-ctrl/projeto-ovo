# OVO (Trilho) — Módulo Financeiro: Visão Geral e Mapa de Funcionalidades
### Rascunho — v0.1 — time financeiro

## Papel deste documento

Este NÃO é uma spec de funcionalidade. É o mapa que fica entre a `constitution.md`
(fundamentos compartilhados com a comunicação) e as specs individuais por vertical
(uma por funcionalidade). Ele responde: quais são as funcionalidades do financeiro,
em que ordem faz sentido especificá-las e construí-las, e quais regras gerais do
domínio financeiro valem para todas elas (sem repetir em cada spec).

Depende de: `constitution.md` — sobretudo as seções de permissões (§5), modelo de
dados compartilhado (§4) e stack técnica (§2). Não duplicar essas decisões aqui;
só referenciar.

---

## 1. Contexto e objetivo do módulo

A OVO é uma escola de artes gerida por Camila (financeiro) e Katlin (comunicação).
O gargalo central do financeiro não é falta de visualização de saldo — é reconciliar
informação fragmentada entre Wix/Pagar.me, e-mail, banco e Excel, transformando isso
em uma base confiável de alunos, cursos, pagamentos e saídas. O módulo financeiro
organiza, concilia e orienta o ritual de gestão financeira; não processa pagamento.

## 2. Funcionalidades do financeiro (mapa)

| # | Funcionalidade | O que resolve | Depende de | Prioridade | Status da spec |
|---|---|---|---|---|---|
| 1 | **Vagões financeiro** (pipeline) | Visualizar o ciclo do dinheiro por aluno: venda → retenção no Wix → liberação → repasse a educadores/espaço → apuração da retirada da Camila. | Pessoa, Curso/Turma, Matrícula (compartilhadas) | Fundacional | 🟡 Em rascunho — `spec-vagoes-financeiro.md` |
| 2 | **Caixa** (fluxo de caixa) | Saldo, recebimentos, repasses, histórico, exportação para contadora. | Vagões (mesmos dados, outra visão) | Fundacional | 🟡 Em rascunho — `spec-caixa.md` |
| 3 | **Pessoas** (visão financeira) | Card financeiro no perfil da pessoa: modalidade, status de pagamento, valor, histórico. | Entidade Pessoa compartilhada com comunicação | Depende de alinhamento com comunicação | ⚪ A especificar depois |
| 4 | **Configurações** (financeiro) | Campos custom, valores por turma (mensalidade/repasse/orçamento), backlog de itens futuros. | Vagões + Caixa (consomem os campos daqui) | Suporte | ⚪ A especificar depois |
| 5 | **Dashboard financeiro** | Panorama do mês, ritual de segunda, pendências. | Todas as anteriores — só agrega | Por último | ⚪ A especificar depois |

**Por que essa ordem:** Vagões e Caixa carregam as regras de negócio e os dados que as outras telas só exibem. Especificar o Dashboard antes delas seria desenhar a vitrine sem saber o que vai ter na loja.

## 3. Regras gerais do domínio financeiro (valem para todas as specs abaixo)

- Financeiro é visível apenas para Camila e contadora — toda spec deste módulo deve tratar isso como requisito, não como detalhe de UI (ver `constitution.md` §5).
- O produto não processa pagamento nem substitui Wix/banco — qualquer funcionalidade que pareça "executar" uma cobrança deve ser reformulada como "registrar/refletir" uma cobrança que já aconteceu em outro lugar.
- Toda informação numérica deve mostrar origem e confiabilidade (dado vindo do Wix vs. registrado manualmente no Trilho) — já validado como princípio de craft com a Camila.
- Hierarquia de camadas do domínio (da mais básica à mais avançada), útil para não pular etapas:
  1. Base: pessoas, cursos/turmas, matrículas, educadores, categorias financeiras.
  2. Operação: entradas, saídas, reconciliação, pendências, documentos, status.
  3. Ritual: checklist semanal, fechamento do mês, pagamento a educadores, alertas.
  4. Visibilidade: dashboard, indicadores, comparação por curso, projeções simples.
  5. Inteligência: copiloto e automações — só depois que 1-3 estiverem confiáveis.
- Nenhuma funcionalidade deste módulo deve duplicar cadastro de pessoa/curso/matrícula — sempre reutilizar a entidade compartilhada.

## 4. Entidades específicas do domínio financeiro

(Além de Pessoa, Curso/Turma e Matrícula, que são compartilhadas e vivem na `constitution.md`)

| Entidade | Para que serve |
|---|---|
| Cobrança/recebimento | Registro de cada valor esperado/recebido de um aluno. |
| Repasse/pagamento | Registro de cada valor pago a um educador, ao espaço, ou retirado pela Camila. |
| Categoria financeira | Classificação de saída (educador, espaço, material, manutenção, imposto, remuneração). |
| Pendência/tarefa financeira | Alerta acionável (falha de cobrança, nota fiscal faltando, repasse a vencer). |

## 5. Sequenciamento e responsáveis (rascunho — confirmar no encontro)

| Semana | O que acontece |
|---|---|
| Esta semana | Duas pessoas pegam Vagões financeiro e Caixa, cada uma valida/ajusta o rascunho da respectiva spec. |
| Próxima segunda | Grupo revisa as duas specs, fecha o que depende só do financeiro, leva pro grupo todo o que depende de comunicação/técnico (constitution.md). |
| Depois | Pessoas (visão financeira) e Configurações entram na fila — Pessoas precisa de conversa com o time de comunicação antes, por ser entidade compartilhada. |
| Por último | Dashboard financeiro, quando os três anteriores já tiverem dado/regra suficiente pra agregar. |

## 6. O que ainda não está decidido neste nível macro

- Se "Configurações" do financeiro é uma spec própria ou vira uma seção dentro de Caixa/Vagões (ela hoje só existe para alimentar as outras duas).
- Se "Pessoas (visão financeira)" precisa de spec própria ou é só uma seção adicional na spec de Pessoas da comunicação (decisão de arquitetura de documentação, não de produto — a entidade é uma só).

Essas duas são de baixo risco e podem ser decididas depois — não bloqueiam começar por Vagões e Caixa.
