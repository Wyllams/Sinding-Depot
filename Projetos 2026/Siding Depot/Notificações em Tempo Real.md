---
tags:
  - notificações
  - siding-depot
  - realtime
  - supabase
created: 2026-04-17
---

# 🔔 Notificações em Tempo Real

> Voltar para [[🏗️ Siding Depot — Home]]

---

## Componente: `NotificationBell`

| Feature | Detalhes |
|---------|----------|
| **Badge** | Contagem de não-lidas no ícone (sino) |
| **Dropdown** | Lista últimas 30 notificações |
| **Realtime** | Supabase Realtime subscription no `INSERT` |
| **Mark as Read** | Individual ou "Mark All Read" |
| **Navegação** | Click em notificação navega para o [[Projects\|projeto]] relacionado |

---

## Tipos de Notificação

| Tipo | Ícone | Cor | Quando é gerada |
|------|-------|-----|-----------------|
| `new_job` | `person_add` | `#aeee2a` (Verde) | Novo job via [[Webhook ClickOne]] ou [[New Project]] |
| `new_change_order` | `edit_note` | `#e3eb5d` (Amarelo) | Novo [[Change Orders\|Change Order]] criado |

---

## Mecanismo Técnico

```
Supabase Realtime Channel → "public:notifications"
Event: INSERT
→ Re-fetch últimas 30 notificações
→ Atualiza badge count
```

---

## Geração de Notificações

Notificações são inseridas automaticamente por:

1. **[[Webhook ClickOne]]** → Quando novo job é criado via CRM
2. **Database Triggers** → Quando [[Change Orders]] são criadas/atualizadas
3. **[[Services e Warranty]]** → Alertas de chamados

---

## Relacionados
- [[Webhook ClickOne]]
- [[Change Orders]]
- [[Projects]]
- [[Design System]]
