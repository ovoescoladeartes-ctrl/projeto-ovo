# Trilho (OVO) — Context Brief

> Cole este documento no início de qualquer nova sessão do Claude para pular a fase de aquecimento.

## Quem está construindo

Time da **Comunidade Design Croquete** (projeto CroqueterIA), dividido em duas frentes —
financeiro e comunicação — com moderação do Samico. Construção com **Claude Code / IA**,
a partir de specs escritas pelo próprio time. As usuárias reais participam da validação
em encontros recorrentes, então o produto é construído *com* elas, não *para* elas.

## O que é

Trilho é a camada de registro e ritual de gestão da OVO, uma escola de artes gerida por
duas pessoas. Ele **não substitui** as ferramentas onde o trabalho já acontece (Wix/Pagar.me,
banco, WhatsApp, Instagram) — ele registra e reflete o que aconteceu nelas, organizando
os rituais de gestão de Camila (financeiro) e Katlin (comunicação).

## A interação central

São dois rituais distintos sobre uma base de dados compartilhada:

**Camila (financeiro), toda segunda:**
1. Abre o Caixa e vê o saldo vivo sem clicar em nada.
2. Registra os recebimentos que caíram (Wix ou Pix manual), vinculando a aluno e turma.
3. Registra ou marca como pago os repasses a educadores e espaço.
4. Vê quantas pendências sobraram.

**Katlin (comunicação), três vezes ao dia:**
1. Chega uma mensagem nova → cadastra o contato em 3 passos (nome, canal, o que perguntou).
2. Responde depois, usando a Biblioteca de Mensagens (copiar e colar no WhatsApp).
3. Move o contato no board de vagões conforme ele avança no funil.
4. O board mostra, por cor/ordem, quem está esperando há mais tempo — sem precisar clicar.

## Para quem é

- **Camila** — sócia responsável pelo financeiro. Hoje reconcilia manualmente Wix, e-mail,
  banco e Excel. Módulo financeiro é visível apenas para ela e a contadora.
- **Katlin** — responsável pela comunicação. Hoje responde a mesma pergunta repetidamente,
  em tempo real, sem lugar para registrar quem já foi contatado.
- Não é um produto para escolas em geral. É um produto para essas duas pessoas nesta escola.

## Por que vale construir

A hipótese é de **minimalismo**: existem ferramentas no mercado que resolvem cada pedaço
(Trello resolve kanban, mas resolve mais 300 coisas que elas não precisam). Nenhuma resolve
esse conjunto específico sem trazer peso junto. A aposta é que uma ferramenta pequena, que
resolve exatamente o que essas duas pessoas fazem, ganha de uma ferramenta grande e genérica.

O risco assumido: no v1 tudo é entrada manual. Se o ritual de registro não se sustentar,
o produto não sobrevive — essa pergunta foi feita diretamente à Camila e a resposta ainda
precisa ser provada na prática, não no discurso.

## Fora de escopo (v1)

- Qualquer integração automática (Wix, Pagar.me, banco, WhatsApp, Instagram, e-mail)
- Copiloto / consulta em linguagem natural
- Dashboards e indicadores agregados
- Checklist e calendário
- Exportação para contadora
- Configurações avançadas (campos custom, valores por turma)
- Envio de mensagem ou processamento de pagamento — o Trilho **nunca** executa ação externa

## Regras invioláveis do produto

1. O Trilho registra e reflete; nunca executa a ação externa.
2. Nada é apagado — encerrar/arquivar/inativar move para lista separada.
3. Toda informação mostra **origem e confiabilidade** (dado do Wix vs. registrado manualmente).
4. Nenhuma tela duplica cadastro de pessoa/curso/matrícula — sempre reutiliza a entidade compartilhada.
5. Cada módulo só avança de camada quando a anterior está confiável:
   base → operação → ritual → visibilidade → inteligência.
6. Financeiro é visível apenas para Camila e contadora.
7. Comunicação: registrar sempre precede responder.

## Material existente

- `produto-overview-consolidado.md` (v0.2) — decisões de produto consolidadas, base deste brief
- `financeiro-overview.md` e `comunicacaooverview.md` — mapas de funcionalidade por módulo
- `spec-caixa.md`, `spec-vagoes-financeiro.md` — specs em rascunho
- `constitution.md` — fundamentos compartilhados (design system, permissões, modelo de dados)
- Discovery geral OVO (sessão 1), matriz MoSCoW, Crazy 8s, mapas de fluxo, edge cases
- Anotações das reuniões de alinhamento com Camila (08/07) e Katlin (10/07)
