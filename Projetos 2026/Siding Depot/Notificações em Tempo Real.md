---
tags:
  - notificações
  - siding-depot
  - realtime
  - supabase
created: 2026-04-17
updated: 2026-04-18
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
| **Navegação** | Click em notificação navega para o [[Projects|projeto]] relacionado |

---

## Tipos de Notificação

| Tipo | Ícone | Cor | Quando é gerada | Gerada por |
|------|-------|-----|-----------------|------------|
| `new_job` | `person_add` | `#aeee2a` (Verde) | Novo job via CRM | [[Webhook ClickOne]] |
| `new_change_order` | `edit_note` | `#e3eb5d` (Amarelo) | Novo CO criado | [[Change Orders]] |
| `document_signed` | `contract_edit` | `#818cf8` (Roxo) | **Cliente assina documento** | `/api/documents/sign` |

---

## Tabela: `notifications`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users (quem recebe) |
| `title` | text | Título da notificação |
| `body` | text | Corpo com detalhes |
| `notification_type` | text | `new_job`, `new_change_order`, `document_signed` |
| `read` | boolean | Se já foi lida |
| `related_entity_id` | uuid | ID da entidade relacionada (job, CO, milestone) |
| `created_at` | timestamptz | Data de criação |

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
4. **`/api/documents/sign`** → Quando cliente assina um documento

### Notificação de Assinatura (novo)

Quando um **cliente assina** um documento no [[Customer Portal]]:

```typescript
// Em /api/documents/sign/route.ts (Step 7)
// 1. Busca nome do cliente (milestone → job → customer)
// 2. Busca todos os admin users
// 3. Insere notificação para cada admin:
{
  user_id: admin.id,
  title: "Document Signed",
  body: 'John Smith signed "Job Start Certificate" — $15,000',
  notification_type: "document_signed",
  read: false,
  related_entity_id: milestone.id  // ID do milestone assinado
}
```

> ⚠️ A falha na notificação **não bloqueia** a assinatura (try/catch isolado).

---

## Relacionados
- [[Webhook ClickOne]]
- [[Change Orders]]
- [[Projects]]
- [[Customer Portal]]
- [[Documentos e Contratos Digitais]]
- [[Design System]]
