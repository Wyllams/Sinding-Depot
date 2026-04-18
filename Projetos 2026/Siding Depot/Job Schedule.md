---
tags:
  - schedule
  - siding-depot
  - gantt
  - calendário
  - drag-and-drop
created: 2026-04-17
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

---

## Automações Inteligentes

| Automação | Detalhe |
|-----------|---------|
| **Siding → Paint** | Ao mover um job de Siding, o job de Paint correspondente (mesmo cliente) se move automaticamente para o dia seguinte |
| **Sunday Block** | Não permite agendar em Domingos (day OFF) |
| **Duration Awareness** | Barras se estendem corretamente por múltiplos dias |

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
