# Spec: Vagões financeiro (pipeline de ciclo do dinheiro)
### Status: Rascunho — para validação do time financeiro
### Depende de: constitution.md (entidades compartilhadas, permissões) · financeiro-overview.md

## Visão geral

Vagão financeiro é a visualização em etapas do ciclo que o dinheiro de um aluno
percorre desde a venda de um curso até a apuração da retirada da Camila. Substitui
o cruzamento manual de Wix + e-mail + banco que a Camila faz hoje. Conceito já
apresentado e aprovado em direção geral na reunião de 08/07 — as etapas abaixo
foram descritas como exploração inicial naquele momento e precisam ser confirmadas
como definitivas nesta spec.

## Cenários de uso e histórias de usuário

### US-1 (P1): Ver o dinheiro de um aluno percorrer o ciclo
**Por que essa prioridade:** é o cenário que resolve a dor central (reconciliação manual).
**Teste independente:** Camila consegue, olhando só pro board de vagões, dizer em que
etapa está o pagamento de um aluno específico, sem abrir Wix ou e-mail.

**Cenários de aceite:**
- Dado um aluno que comprou um curso pelo site, Quando o pagamento é confirmado pelo Wix, Então um card aparece na coluna "Vendido" com valor, curso e data.
- Dado um card em "Vendido", Quando o Wix libera o valor retido, Então o card se move para "Liberado" (ou passa por "Retido" antes, conforme regra de retenção do Wix).
- Dado um card em "Liberado", Quando a Camila registra o repasse a um educador, Então o card correspondente àquele valor se move para "Repassado".

### US-2 (P1): Registrar o repasse a um educador
**Por que essa prioridade:** é a ação manual mais frequente da Camila dentro deste vagão.
**Teste independente:** Camila consegue marcar um valor como repassado e ver o educador, o valor e a nota fiscal associados.

**Cenários de aceite:**
- Dado um card em "Liberado" vinculado a um educador, Quando a Camila confirma o repasse, Então o sistema registra data, valor e pede a nota fiscal (ver Edge Cases sobre bloqueio).
- Dado um repasse feito, Quando a Camila abre o card, Então ela vê o comprovante/nota fiscal anexados (se houver).

### US-3 (P2): Fechar o mês e ver a retirada da Camila
**Por que essa prioridade:** acontece uma vez por mês, não toda semana — mas é o indicador de saúde financeira que a própria Camila apontou como o mais importante (o que sobra depois de tudo pago).
**Teste independente:** Camila consegue ver, ao fim do mês, o valor apurado como sua retirada, com os componentes que chegaram a esse número.

**Cenários de aceite:**
- Dado que todos os repasses do mês foram feitos, Quando a Camila fecha o mês, Então o sistema calcula e mostra a retirada (receita − repasses − custos fixos).

## Modelo de card por etapa (rascunho a validar com a Camila)

| Campo | Vendido | Retido | Liberado | Repassado | Mês fechado |
|---|---|---|---|---|---|
| Pessoa/destino vinculado | aluno | aluno | aluno | educador / espaço / materiais | Camila (retirada) |
| Valor | ✓ | ✓ | ✓ | ✓ | ✓ |
| Curso/turma | ✓ | ✓ | ✓ | papel (ex: "Educadora · Aquarela") | — |
| Data prevista/vencimento | data da venda | previsão de liberação (Wix) | data liberado | data de repasse | data de fechamento |
| Nota fiscal | — | — | — | status (ok/pendente) | — |
| Comprovante/anexo | — | — | — | opcional | ✓ (relatório) |
| Observação livre | opcional | opcional | opcional | opcional | opcional |
| Ação disponível no card | — | — | "marcar como repassado" | "marcar como repassado" (se ainda não feito) | "ver relatório do mês" |

## Máquina de estados do vagão

```
Vendido → Retido → Liberado → Repassado → Mês fechado
  (venda      (Wix       (Wix         (Camila       (fechamento
   confirmada) retém      libera)      registra      mensal,
               o valor)                repasse)      automático
                                                      ou manual —
                                                      a definir)
```

Regras de transição a confirmar:
- Vendido → Retido → Liberado: em teoria deveria ser automático via sincronização com o Wix. Depende da resposta técnica sobre integração (ver constitution.md §2). Até lá, é manual.
- Liberado → Repassado: ação manual da Camila (ela decide quando paga).
- Repassado → Mês fechado: por enquanto entendido como cálculo agregado no fim do mês, não uma ação por card individual.

## Requisitos funcionais

- RF-01: O sistema DEVE exibir um board com as colunas Vendido, Retido, Liberado, Repassado e Mês fechado.
- RF-02: Cada card DEVE mostrar pessoa/destino, valor e curso/papel conforme a tabela de modelo de card acima.
- RF-03: O sistema DEVE permitir marcar um card como repassado, registrando data e valor.
- RF-04: O sistema DEVE vincular nota fiscal (ou seu status) a cards na coluna Repassado.
- RF-05: O sistema DEVE calcular e exibir a retirada apurada da Camila ao fechar o mês.
- RF-06: O board DEVE ser visível apenas para papéis com permissão financeira (Camila, contadora) — ver constitution.md §5.
- RF-07 `[NEEDS CLARIFICATION: as 5 colunas atuais (Vendido/Retido/Liberado/Repassado/Mês fechado) são definitivas, ou a Camila quer ajustar nomes/quantidade de etapas?]`
- RF-08 `[NEEDS CLARIFICATION: pagamento a educador sem nota fiscal deve bloquear a ação "marcar como repassado", ou apenas exibir alerta e permitir seguir?]`

## Casos de borda

- Aluno cancela depois de "Vendido" mas antes de "Liberado" — o card deve ser cancelado, não simplesmente removido (precisa manter histórico).
- Educador não confirma quantidade de alunos/horas — repasse fica bloqueado até confirmação (regra já mencionada no domínio, detalhar critério de aceite).
- Pix direto (fora do fluxo do Wix) — entra manualmente em "Vendido" ou "Retido"? Precisa virar critério de aceite explícito, não só nota de rodapé.
- Bolsa/permuta — não gera valor de venda, mas ocupa vaga. Confirmar se aparece no board com valor zero ou fica fora do vagão.
- Curso não atinge o mínimo de alunos — dispara cancelamento em cascata de vários cards "Vendido" — regra de negócio a confirmar volume de impacto.

## Critérios de sucesso

- SC-01: Camila consegue identificar em que etapa está o pagamento de qualquer aluno em menos de 30 segundos, sem abrir Wix, e-mail ou planilha.
- SC-02: 100% dos repasses a educadores feitos pelo sistema têm nota fiscal vinculada ou alerta explícito de pendência.
- SC-03: O valor de retirada apurada ao fim do mês bate com o cálculo manual que a Camila faz hoje (validar lado a lado no primeiro mês de uso).

## Suposições (o que assumimos por padrão até alguém dizer o contrário)

- As transições Vendido→Retido→Liberado começam manuais e passam a ser automáticas quando a integração com o Wix permitir (constitution.md §2).
- Um card representa um valor (um aluno, uma cobrança) — não um lote agregado de vários alunos.
- "Mês fechado" é um cálculo agregado, não uma ação de mover cards individualmente.

## Perguntas em aberto — separadas por responsável

**Só o time financeiro decide:**
- RF-07 e RF-08 acima (nomes das etapas e regra de bloqueio por nota fiscal).
- Se bolsa/permuta e Pix direto entram no vagão ou ficam de fora do MVP.

**Precisa do grupo inteiro:**
- Se a transição Vendido→Retido→Liberado pode ser automatizada via Wix (depende da decisão técnica da constitution.md §2).
- Se o board de vagões financeiro compartilha componente visual com o board de comunicação (design system — constitution.md §3).
