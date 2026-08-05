# Trilho — Checklist de implementação v1

Espelha os checkpoints incrementais de [`plano-v1.md`](./plano-v1.md). Cada item marcado
já foi implementado e testado em localhost. Ver o plano para detalhes de cada checkpoint.

## Fase 0 — Setup

- [x] Branch `feature/v1-implementation` criada a partir de `feature/ui-tweaks`
- [x] Dependências novas instaladas (`@dnd-kit/*`, `csv-parse`, componentes shadcn:
      `dialog command popover label textarea table`)
- [x] `AppSidebar.tsx`: hrefs reais + roles por item (Vagões, Pessoas, Caixa)
- [ ] Emuladores Firestore/Auth (opcional — não configurado, testando contra Firebase real)

## Fase 1 — Base compartilhada (Pessoa, Turma, Matrícula)

- [x] **1.1** Schema Pessoa + `criarPessoa`/lista em `/pessoas` (Dialog de criação, sem detalhe)
- [x] **1.2** Rota `/pessoas/[id]` — detalhe básico (editar, inativar)
- [x] **1.3** Schema Turma + rota `/pessoas/turmas` (CRUD)
- [x] **1.4** `PessoaCombobox.tsx` isolado
- [x] **1.5** Schema Matrícula + fluxo de matricular + lista de matrículas no detalhe da Pessoa
- [x] **1.6** Guarda de role explícita em `/pessoas` e `/pessoas/turmas`

## Fase 2 — Financeiro (Caixa)

- [x] **2.1** Schema recebimentos + aba Recebimentos em `/caixa` (sem KPIs ainda)
- [x] **2.2** Schema repasses + aba Repasses
- [x] **2.3** `saldo.ts` + os 3 KPIs no cabeçalho
- [x] **2.4** Ação "marcar repasse como pago" (idempotente)
- [x] **2.5** Restrição de role + filtro por origem/status no histórico

## Fase 3 — Comunicação (Vagões + Biblioteca de Mensagens)

- [x] **3.1** Schema contatos + `NovoContatoDialog` + `/vagoes` como lista simples
- [x] **3.2** Board visual desktop (6 colunas, sem drag)
- [x] **3.3** Drag and drop desktop (`@dnd-kit` + `useOptimistic`)
- [x] **3.4** Mobile: seletor de estágio + botão "mover para →"
- [x] **3.5** `urgencia.ts` + codificação por cor nos cards
- [x] **3.6** Schema mensagens + rota `/mensagens` (CRUD Biblioteca)
- [x] **3.7** `MensagemPickerSheet` integrado ao card
- [x] **3.8** Filtro "curso: todos" no board (should-have) — placeholder visual não-funcional, ver nota
- [x] **3.9** Restrição de role em `/vagoes` e `/mensagens`

## Fase 4 — Ponto de encontro (conversão contato → pessoa)

- [x] **4.1** `converterContatoEmPessoa` transacional (drag e botão)

## Fase 5 — Import CSV (carga inicial de Pessoas)

- [x] **5.1** `/pessoas/importar` — preview dry-run, sem gravar
- [x] **5.2** `confirmar=true` grava (batches) + reimport aponta duplicatas
