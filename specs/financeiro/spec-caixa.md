# Spec: Caixa (fluxo de caixa)
### Status: Rascunho — para validação do time financeiro
### Depende de: constitution.md (entidades compartilhadas, permissões) · financeiro-overview.md · spec-vagoes-financeiro.md (mesmos dados, outra visão)

## Visão geral

Caixa é a visão consolidada do dinheiro da escola: quanto entrou, quanto saiu, quanto
está retido no Wix, quanto falta repassar, e o histórico de tudo isso — organizada
para substituir o Excel que a Camila mantém hoje. Não processa pagamento; reflete o
que já aconteceu no Wix/banco e o que a Camila registra manualmente.

## Cenários de uso e histórias de usuário

### US-1 (P1): Saber se o mês está indo bem, sem abrir planilha
**Por que essa prioridade:** é a pergunta que a própria Camila descreveu como o indicador nº 1 de saúde financeira ("o que sobra depois de pagar tudo").
**Teste independente:** Camila abre a tela e, sem clicar em nada, sabe o saldo vivo, quanto falta receber do Wix, e quantos repasses estão pendentes.

**Cenários de aceite:**
- Dado o mês em andamento, Quando a Camila abre Caixa, Então vê saldo vivo (confirmado, saídas já pagas), valor a liberar do Wix, recebido no mês vs. meta, e quantidade de repasses pendentes.

### US-2 (P1): Conciliar um recebimento
**Por que essa prioridade:** é o gargalo central hoje (cruzar Wix + e-mail + banco manualmente).
**Teste independente:** Camila encontra, para qualquer valor que caiu na conta, a qual aluno/curso ele pertence e o status de conciliação.

**Cenários de aceite:**
- Dado um recebimento importado do Wix, Quando a Camila abre o histórico de recebimentos, Então vê aluno, modalidade, valor, forma de pagamento, origem e status (confirmada/retida no Wix/pendente).
- Dado um Pix recebido fora do Wix, Quando a Camila registra manualmente, Então o sistema marca a origem como "manual/Trilho" (não "Wix"), preservando rastreabilidade.

### US-3 (P2): Exportar relatório para a contadora
**Por que essa prioridade:** acontece com menor frequência, mas é bloqueante para a rotina contábil.
**Teste independente:** a contadora recebe um arquivo com os dados que ela de fato usa (formato ainda não confirmado com ela — ver Perguntas em aberto).

**Cenários de aceite:**
- Dado um período fechado, Quando a Camila clica em "exportar relatório do mês", Então o sistema gera um arquivo com entradas, saídas e saldo do período.

## Requisitos funcionais

- RF-01: O sistema DEVE exibir, no topo da tela, saldo vivo, valor a liberar do Wix, recebido no mês vs. meta, e quantidade de repasses pendentes.
- RF-02: O sistema DEVE ter uma aba/lista de recebimentos com aluno, modalidade, valor, forma de pagamento, origem e status.
- RF-03: O sistema DEVE ter uma aba/lista de pagamentos (repasses) com destino, papel/turma, valor, vencimento, nota fiscal, status e ação de marcar como pago.
- RF-04: O sistema DEVE ter uma visão de fluxo de caixa por período: entradas por categoria, saídas por destino (educadores/casa/retirada), saldo do período.
- RF-05: O sistema DEVE indicar a origem de cada dado (Wix vs. registro manual no Trilho) em todo valor exibido.
- RF-06: O sistema DEVE permitir exportar um relatório do período (formato a confirmar com a contadora).
- RF-07: A tela e todos os seus dados DEVEM ser visíveis apenas para papéis com permissão financeira (Camila, contadora) — ver constitution.md §5.
- RF-08 `[NEEDS CLARIFICATION: como a "meta do mês" é definida — é um valor fixo cadastrado manualmente, uma média histórica, ou soma das mensalidades esperadas das matrículas ativas?]`
- RF-09 `[NEEDS CLARIFICATION: quais estados de recebimento realmente precisam existir no MVP — hoje as telas usam confirmada/retida-wix/pendente-pix, mas o domínio já mapeou também falhou, reembolsado e cancelado. Cortar de propósito ou cobrir todos?]`

## Casos de borda

- Recebimento aparece na conta sem "legenda" suficiente para saber a qual aluno pertence — precisa de um estado explícito "a conciliar", não pode ficar escondido dentro de "confirmada".
- Falha de cobrança (cartão recusado pelo Wix) — vira pendência, mas não deve reduzir o "recebido no mês" até ser resolvida.
- Pix pendente de confirmação — precisa de ação clara para a Camila confirmar manualmente (ela não recebe isso automaticamente do Wix).
- Nota fiscal não enviada por um educador — repasse fica com status pendente; confirmar (na spec de Vagões) se isso bloqueia ou apenas alerta.
- Conta PJ recebe também renda de atividade pessoal da Camila (arteterapia) — precisa de separação manual, sem misturar com o caixa da escola.
- Exportação para contadora — ninguém confirmou ainda o formato/campos que ela realmente precisa (risco de retrabalho se a Camila descobrir depois que falta algo).

## Critérios de sucesso

- SC-01: Camila consegue responder "o mês está indo bem?" olhando só para os 4 números do topo da tela, sem abrir Excel.
- SC-02: Todo recebimento tem origem visível (Wix ou manual) e status de conciliação, sem exceção.
- SC-03: A exportação de relatório é aceita pela contadora sem pedido de complemento manual (validar no primeiro envio real).

## Suposições

- O "saldo vivo" é definido como recebido confirmado menos saídas já pagas (equivalente ao "sobra depois de pagar tudo" que a Camila descreveu).
- A meta do mês, até ser definida de outra forma, é um valor que a própria Camila cadastra manualmente (ver RF-08).
- O MVP cobre os três estados de recebimento já vistos nas telas (confirmada/retida/pendente); falha, reembolso e cancelamento entram numa iteração seguinte, a menos que o time decida o contrário.

## Perguntas em aberto — separadas por responsável

**Só o time financeiro decide:**
- RF-08 (como a meta do mês é definida).
- RF-09 (quais estados de recebimento entram no MVP).
- Formato de exportação para a contadora (precisa confirmar com ela diretamente).

**Precisa do grupo inteiro:**
- Nenhuma pendência crítica específica desta spec depende só do grupo — mas ela herda a pendência de permissões (RF-07) já registrada como prioridade crítica na constitution.md §5.
