---
tags:
  - schedule
  - siding-depot
  - gantt
  - calendário
  - drag-and-drop
created: 2026-04-17
updated: 2026-04-20
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
| **Status Dinâmico** | `scheduled` (azul) → `in_progress` (verde) → `done` (verde forte) |
| **Auto-Complete** | Jobs automaticamente marcados como `done` às 18h do último dia |
| **Month Picker** | Seletor de mês/ano com navegação semanal |
| **Cards Side-by-Side** | Cards sobrepostos no mesmo dia dividem espaço verticalmente (50/50) |
| **Nome do Serviço** | Cada card mostra o nome real (ex: "Windows" ou "Doors"), não a categoria genérica |
| **Auto-Confirm** | Status muda automaticamente para `Confirmed` quando hoje ≥ data de início |

---

## Cards Sobrepostos (Side-by-Side)

Quando múltiplos serviços (ex: Windows + Doors) são agendados no mesmo dia para o mesmo parceiro, os cards **dividem o espaço verticalmente**:

| Overlap | Comportamento |
|---------|---------------|
| 1 card | Ocupa 100% da altura da row |
| 2 cards | Cada um ocupa 50% (lado a lado verticalmente) |
| 3+ cards | Divide igualmente (33%, etc.) |

- A row **aumenta de altura automaticamente** para acomodar múltiplos cards (`max(80px, N × 60px)`)
- Gap de 4px entre cards sobrepostos
- Detecção de overlap baseada em day ranges (não apenas dia exato)

---

## Automações Inteligentes

| Automação | Detalhe |
|-----------|---------|
| **Siding → Paint** | Ao mover um job de Siding, o job de Paint correspondente (mesmo cliente) se move automaticamente para o dia seguinte |
| **Sunday Block** | Não permite agendar em Domingos (day OFF) |
| **Duration Awareness** | Barras se estendem corretamente por múltiplos dias |
| **Auto-Confirm** | Jobs `Tentative` mudam automaticamente para `Confirmed` quando a data de início chega |

---

## Auto-Confirm (Status Automático)

O status do job no popup/modal muda automaticamente baseado na data:

| Status DB (`jobs.status`) | Label no Popup | Comportamento |
|---------------------------|----------------|---------------|
| `draft` | **Tentative** (amarelo) | Padrão para jobs futuros |
| `active` | **Confirmed** (verde) | Quando hoje ≥ data de início |
| `on_hold` | **Pending** (vermelho) | Bloqueio manual, não é alterado |

### Regras de transição automática:

| Cenário | Resultado |
|---------|----------|
| Job `Tentative` + início **amanhã** | Mantém `Tentative` |
| Job `Tentative` + início **hoje** | → `Confirmed` ✅ |
| Job `Tentative` + início **ontem** | → `Confirmed` ✅ |
| Job `Pending` + qualquer data | Mantém `Pending` (não altera) |

> [!NOTE]
> A transição é calculada no **frontend** ao carregar os dados. O status no banco (`jobs.status`) permanece inalterado até o usuário salvar.

---

## Diferenciação de Serviços nos Cards

Cada card no calendário mostra o **nome específico do serviço** ao invés da categoria genérica:

| Antes | Agora |
|-------|-------|
| `DOORS WINDOWS` | `WINDOWS` (card 1) + `DOORS` (card 2) |
| `DOORS WINDOWS` | `WINDOWS` (se só windows) |
| `SIDING` | `SIDING` (sem mudança) |

→ Usa `serviceNames[0]` (vindo de `service_types.name`) ao invés de `serviceType.replace("_", " ")`

---

## Integração com Webhook

Jobs criados via [[Webhook ClickOne]] aparecem automaticamente no calendário com:

| Campo | Fonte | Resultado |
|-------|-------|-----------|
| **Data de início** | `customData.Agendamento` | Posição no calendário |
| **Crew** | `Crew Lead` + defaults | Row do parceiro correto |
| **Duração** | SQ × fórmula | Largura do card |
| **Status** | `scheduled` | Card azul |

→ Cascade automática: Siding → Painting → Gutters → Roofing

---

## Modal de Rescheduling

- Seleção de nova data (DatePicker com domingos desabilitados)
- Ajuste de duração (spinner)
- Seleção de SQ (square footage)
- Crew assignment dropdown filtrado por especialidade
- Preview de impacto (jobs afetados tipo Paint após Siding)
- Status do job (active, draft, on_hold)

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
