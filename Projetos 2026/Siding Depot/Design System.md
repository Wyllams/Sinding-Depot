---
tags:
  - design-system
  - siding-depot
  - ui
  - componentes
  - cores
created: 2026-04-17
---

# 🎨 Design System

> Voltar para [[🏗️ Siding Depot — Home]]

---

## Paleta de Cores

| Token | Hex | Uso |
|-------|-----|-----|
| **Primary (Lime)** | `#aeee2a` | CTAs, badges, destaques |
| **Background** | `#0d0f0d` | Fundo principal |
| **Surface** | `#121412` | Cards, containers |
| **Surface Hover** | `#1e201e` | Hover states |
| **Text Primary** | `#faf9f5` | Texto principal |
| **Text Secondary** | `#ababa8` | Labels, subtextos |
| **Text Muted** | `#474846` | Placeholders, bordas |
| **Danger** | `#ff7351` | Erros, alertas críticos |
| **Warning** | `#e3eb5d` | Atenção, pendências |
| **Info** | `#60b8f5` | Informações, links |
| **Success** | `#22c55e` | Confirmações, done |

---

## Tipografia

| Uso | Fonte |
|-----|-------|
| **Headline** | Manrope (Google Fonts) — extra-bold, tracking-tighter |
| **Body** | System UI stack |
| **Code** | Monospace (font-mono) |

---

## Componentes Compartilhados

| Componente | Descrição |
|------------|-----------|
| `TopBar` | Barra superior com título, avatar, [[Notificações em Tempo Real\|notificações]], busca |
| `Sidebar` | Navegação lateral com 10 itens, drawer mobile, logo com glow |
| `SidebarContext` | Context React para toggle mobile |
| `CustomDatePicker` | DatePicker com variante "ghost" para inline edit |
| `NotificationBell` | Sino com dropdown realtime |
| `UndoContext` | Context global para sistema de undo |
| `DynamicContractForm` | Formulário de [[Documentos e Contratos Digitais\|contrato digital]] |
| `NewServiceCallModal` | Modal de criação de [[Services e Warranty\|chamados]] |
| `ServiceReportPanel` | Painel lateral de report com upload de mídia |

---

## Padrões de UI

- **Dark mode nativo** — todo o sistema é dark-first
- **Glassmorphism** com `backdrop-blur` e bordas semi-transparentes
- **Hover animations** com `scale`, `brightness`, e `boxShadow` transitions
- **Responsive** — Mobile-first com drawer sidebar em telas pequenas
- **Material Symbols** (Outlined) para iconografia
- **Rounded corners** (`rounded-xl` / `rounded-2xl`) em todos os elementos
- **Micro-animations** para feedback interativo

---

## Navegação da Sidebar

| Ícone | Label | Rota | Módulo |
|-------|-------|------|--------|
| `dashboard` | Dashboard | `/` | [[Dashboard]] |
| `folder_open` | Projects | `/projects` | [[Projects]] |
| `groups` | Crews | `/crews` | [[Crews e Partners]] |
| `swap_horiz` | Change Orders | `/change-orders` | [[Change Orders]] |
| `payments` | Cash Payments | `/cash-payments` | [[Cash Payments]] |
| `window` | Windows Tracker | `/windows-tracker` | [[Windows e Doors Tracker]] |
| `support_agent` | Services | `/services` | [[Services e Warranty]] |
| `calendar_month` | Schedule | `/schedule` | [[Job Schedule]] |
| `bar_chart` | Sales Reports | `/sales-reports` | [[Sales Reports]] |
| `settings` | Settings | `/settings` | [[Settings]] |

---

## Relacionados
- [[Arquitetura Técnica]]
- Todos os módulos utilizam este Design System
