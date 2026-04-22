---
tags:
  - schedule
  - siding-depot
  - gantt
  - calendário
  - drag-and-drop
  - duração
created: 2026-04-17
updated: 2026-04-22
---

# 📅 Job Schedule — Calendário Gantt Semanal

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `/schedule`

---

## Funcionalidades Core

| Feature | Detalhes |
|---------|----------|
| **Gantt Semanal** | Visualização de segunda a domingo com barras horizontais |
| **Drag & Drop** | Arrastar cards entre dias para reagendar |
| **Categorias** | Filtro por serviço: Siding, Doors/Windows, Paint, Gutters, Roofing |
| **Rows por Partner** | Cada linha representa um parceiro/crew ([[Crews e Partners]]) |
| **Status Dinâmico** | `Pending` (vermelho) → `Confirmed` (azul) → `In Progress` (verde) → `Done` |
| **Auto-Complete** | Jobs automaticamente marcados como `done` às 18h do último dia |
| **Month Picker** | Seletor de mês/ano — navega para primeira segunda-feira do mês selecionado |
| **Cards Side-by-Side** | Cards sobrepostos no mesmo dia dividem espaço verticalmente (50/50) |
| **Nome do Serviço** | Cada card mostra o nome real (ex: "Windows" ou "Doors"), não a categoria genérica |
| **Auto-Confirm** | Status muda automaticamente para `Confirmed` quando hoje ≥ data de início |

---

## Status do Job (Atualizado 22/04/2026)

| Status DB (`jobs.status`) | Label no Calendar | Cor | Ícone |
|---------------------------|-------------------|-----|-------|
| `draft` | **Pending** | 🔴 `#ef4444` (Vermelho) | Aguardando atribuição |
| `active` | **Confirmed** | 🔵 `#60b8f5` (Azul) | Parceiro atribuído, agendado |
| — | **In Progress** | 🟢 `#aeee2a` (Verde Lima) | Hoje está dentro do período |
| — | **Done** | 🟢 `#22c55e` (Verde) | Após 18h do último dia |

> [!IMPORTANT]
> **"Tentative" foi renomeado para "Pending"** em 22/04/2026. A cor agora é **vermelha** (antes era amarela/laranja).

### Regras de transição automática:

| Cenário | Resultado |
|---------|----------|
| Job `Pending` + início **amanhã** | Mantém `Pending` |
| Job `Pending` + início **hoje** | → `Confirmed` ✅ |
| Job `Pending` + início **ontem** | → `Confirmed` ✅ |
| Job `on_hold` + qualquer data | Mantém `Pending` (não altera) |

> A transição é calculada no **frontend** ao carregar os dados.

---

## Atribuição Manual de Parceiros (Novo 22/04/2026)

> [!IMPORTANT]
> Parceiros/Crews **NÃO são atribuídos automaticamente** pelo sistema. O Admin (Nick) atribui manualmente via interface.

### Fluxo:
1. Projeto chega via Webhook → cria Job + Services (sem crew)
2. Admin abre projeto → vê serviços sem parceiro
3. Admin seleciona parceiro → Sistema cria `service_assignment` automaticamente
4. Job aparece no calendário com datas calculadas

### O que o sistema calcula ao criar a assignment:
- **Duração** baseada no SQ e tabela do parceiro → [[Calculador de Duração por Parceiro]]
- **Cascade** automática (Siding → Painting → Gutters → Roofing)
- **Skip Sundays** — domingos são pulados
- **Windows/Doors/Decks** com regras próprias de duração

---

## Month Picker (Corrigido 22/04/2026)

O seletor de mês agora navega para a **primeira segunda-feira DENTRO do mês selecionado**:

| Mês Clicado | Dia 1 | Primeira Segunda | Resultado |
|-------------|-------|------------------|-----------|
| Maio 2026 | Sexta | **4 de maio** | ✅ Exibe "maio" |
| Março 2026 | Domingo | **2 de março** | ✅ Exibe "março" |
| Junho 2026 | Segunda | **1 de junho** | ✅ Exibe "junho" |

> [!NOTE]
> Bug corrigido: antes o picker calculava o Monday da semana do dia 1, que podia cair no mês anterior.

---

## Cards Sobrepostos (Side-by-Side)

| Overlap | Comportamento |
|---------|---------------|
| 1 card | Ocupa 100% da altura da row |
| 2 cards | Cada um ocupa 50% (lado a lado verticalmente) |
| 3+ cards | Divide igualmente (33%, etc.) |

- A row **aumenta de altura automaticamente** para acomodar múltiplos cards
- Gap de 4px entre cards sobrepostos
- Detecção de overlap baseada em day ranges

---

## Automações Inteligentes

| Automação | Detalhe |
|-----------|---------|
| **Siding → Paint** | Ao mover um job de Siding, o job de Paint correspondente (mesmo cliente) se move automaticamente para o dia seguinte |
| **Sunday Block** | Não permite agendar em Domingos (day OFF). **Sábado é dia útil** ✅ |
| **Duration Awareness** | Barras se estendem corretamente por múltiplos dias |
| **Auto-Confirm** | Jobs `Pending` mudam automaticamente para `Confirmed` quando a data de início chega |
| **Calculador de Duração** | Ao alterar SQ no modal, recalcula `durationDays` pela tabela do parceiro → [[Calculador de Duração por Parceiro]] |

---

## Calculador de Duração por Parceiro

> **Detalhes completos:** [[Calculador de Duração por Parceiro]]

| Parceiro | Serviço | Lógica |
|---------|---------|--------|
| XICARA / XICARA 02 | Siding | Faixas + `ceil(SQ÷10)` para 21+ SQ |
| WILMAR / WILMAR 02 | Siding | Faixas + `ceil(SQ÷6)` para 13+ SQ |
| SULA | Siding | Faixas progressivas + `round(SQ÷10)` para 56+ SQ |
| LUÍS | Siding | Faixas + `round(SQ÷4.5)` para 28+ SQ |
| OSVIN / OSVIN 02 | Painting | Faixas + `ceil(SQ÷13)` para 41+ SQ |
| VICTOR / JUAN | Painting | Faixas + `round(SQ÷7.5)` para 21+ SQ |
| Qualquer | Gutters / Roofing | **1 dia** fixo |
| Qualquer | Decks | **2 dias** fixo |

---

## Modal de Rescheduling

- Seleção de nova data (DatePicker com domingos desabilitados)
- Ajuste de duração (spinner)
- Seleção de SQ (square footage)
- Crew assignment dropdown filtrado por especialidade
- Preview de impacto (jobs afetados tipo Paint após Siding)
- Status do job (Pending, Confirmed)

---

## Undo System

- Stack de até **50 ações** desfeitas
- Toast de notificação com botão "Undo"
- Botão persistente na TopBar mostrando quantas ações pendentes

---

## Cores por Vendedor

| Inicial | Vendedor | Cor |
|---------|----------|-----|
| **R** | Ruby | `#9f7aea` (Roxo) |
| **M** | Matheus (Matt) | `#2bcbba` (Verde) |

---

## Relacionados
- [[Projects]]
- [[Crews e Partners]]
- [[New Project]]
- [[Webhook ClickOne]]
- [[Calculador de Duração por Parceiro]]
