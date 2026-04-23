---
tags:
  - notificações
  - siding-depot
  - realtime
  - supabase
  - push
  - pwa
created: 2026-04-17
updated: 2026-04-22
---

# 🔔 Notificações em Tempo Real

> Voltar para [[🏗️ Siding Depot — Home]]

---

## Visão Geral

O sistema possui **dois mecanismos** de notificação:

| Tipo | Descrição | Onde aparece |
|------|-----------|-------------|
| **In-App** (Realtime) | Notificações no sino da navbar | Browser aberto no site |
| **Push (PWA)** | Notificações nativas do SO | Tela bloqueada, browser fechado, mobile |

---

## 1. Notificações In-App (Sino)

### Componente: `NotificationBell`

| Feature | Detalhes |
|---------|----------|
| **Badge** | Contagem de não-lidas no ícone (sino) |
| **Dropdown** | Lista últimas 30 notificações |
| **Realtime** | Supabase Realtime subscription no `INSERT` |
| **Mark as Read** | Individual ou "Mark All Read" |
| **Navegação** | Click em notificação navega para o [[Projects|projeto]] relacionado |

### Tabela: `notifications`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users (quem recebe) |
| `title` | text | Título da notificação |
| `body` | text | Corpo com detalhes |
| `notification_type` | text | `new_job`, `new_change_order`, `document_signed`, etc. |
| `read` | boolean | Se já foi lida |
| `related_entity_id` | uuid | ID da entidade relacionada (job, CO, milestone) |
| `created_at` | timestamptz | Data de criação |

### Mecanismo Técnico

```
Supabase Realtime Channel → "public:notifications"
Event: INSERT
→ Re-fetch últimas 30 notificações
→ Atualiza badge count
```

---

## 2. Push Notifications (PWA) — Novo ✅

### Infraestrutura

| Arquivo | Função |
|---------|--------|
| `lib/send-push.ts` | Helper centralizado: envia push + insere notificação in-app |
| `api/push/notify/route.ts` | API interna para frontend disparar push server-side |
| `api/push/send/route.ts` | API que envia push para subscriptions individuais |
| `api/push/subscribe/route.ts` | API que salva subscriptions de dispositivos |
| `components/pwa/PushNotificationInit.tsx` | Monta no layout, registra SW + banner de permissão |
| `components/pwa/PushNotificationManager.tsx` | UI do banner de opt-in |
| `lib/push-notifications.ts` | Utilitários: registro SW, request permission, subscribe |
| `public/sw.js` | Service Worker para receber push em background |

### Tabela: `push_subscriptions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users |
| `subscription` | jsonb | Objeto PushSubscription do browser |
| `created_at` | timestamptz | Data de criação |

### Fluxo de Ativação

```
1. Usuário acessa o site
2. PushNotificationInit → registra Service Worker
3. Banner "Enable Notifications" aparece
4. Usuário clica → browser pede permissão
5. Subscription criada e salva na tabela push_subscriptions
6. Pronto — recebe push mesmo com tela bloqueada
```

### Eventos que Disparam Push

| Evento | Título | Disparado por | Arquivo |
|--------|--------|---------------|---------|
| 📋 Novo Projeto (webhook) | `"New Project from ClickOne"` | Server-side | `webhook/clickone/route.ts` |
| ✍️ Documento Assinado | `"Document Signed"` | Server-side | `documents/sign/route.ts` |
| 📝 Change Order Criada | `"New Change Order"` | Client → API | `change-orders/page.tsx` |
| 📦 Material Extra Solicitado | `"Extra Material Request"` | Client → API | `field/jobs/[id]/page.tsx` |
| 🎨 Cores Submetidas | `"New Color Submission"` | Server-side | `colors/submit/route.ts` |
| 🎨 Edição de Cores | `"Color Edit Request"` | Server-side | `colors/request-edit/route.ts` |

### Helper: `sendPushToAdmins()`

```typescript
// lib/send-push.ts
export async function sendPushToAdmins(params: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notificationType: string;
  relatedEntityId?: string;
}): Promise<void>
```

**O que faz:**
1. Busca todos os admins (`profiles.role = 'admin'`)
2. Insere notificação na tabela `notifications` para cada admin
3. Busca subscriptions de push de cada admin
4. Envia Web Push via `webpush.sendNotification()` (VAPID)
5. Falhas são silenciosas — nunca bloqueia o processo principal

### API: `POST /api/push/notify`

Para uso pelo **frontend** (client-side) quando precisa disparar push:

```typescript
// Exemplo de uso no frontend
await fetch('/api/push/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '📦 Extra Material Request',
    body: 'Partner requested 5x Vinyl Siding for Johnson',
    url: '/projects/abc-123',
    tag: 'extra-material-request',
    notificationType: 'extra_material_request',
    relatedEntityId: 'abc-123',
  }),
});
```

**Segurança:** Protegido por `PUSH_API_SECRET` no header.

### Variáveis de Ambiente

| Variável | Onde | Descrição |
|----------|------|-----------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Client + Server | Chave pública VAPID |
| `VAPID_PRIVATE_KEY` | Server only | Chave privada VAPID |
| `VAPID_SUBJECT` | Server only | Email de contato (ex: `mailto:admin@sidingdepot.com`) |
| `PUSH_API_SECRET` | Server only | Segredo para API `/api/push/notify` |
| `NEXT_PUBLIC_SITE_URL` | Client + Server | URL base do site |

### Compatibilidade por Dispositivo

| Cenário | Funciona? |
|---------|-----------|
| Chrome/Edge desktop (aberto) | ✅ |
| Chrome/Edge desktop (minimizado) | ✅ |
| Chrome/Edge desktop (fechado) | ✅ (se rodando em background) |
| Android Chrome (tela bloqueada) | ✅ |
| Android PWA (Add to Home Screen) | ✅ (recomendado) |
| iPhone Safari (PWA instalado) | ✅ |
| iPhone Safari (sem instalar) | ❌ (Apple exige PWA instalado) |

> [!IMPORTANT]
> No **iPhone**, o site precisa ser **instalado como PWA** (Share → Add to Home Screen) para receber push notifications. Sem isso, Safari não suporta.

---

## Geração de Notificações (Resumo)

| Origem | Mecanismo | Push? | In-App? |
|--------|-----------|-------|---------|
| [[Webhook ClickOne]] | `sendPushToAdmins()` server-side | ✅ | ✅ |
| [[Change Orders]] | Client → `/api/push/notify` | ✅ | ✅ |
| [[Field App]] (Material Extra) | Client → `/api/push/notify` | ✅ | ✅ |
| `/api/documents/sign` | `sendPushToAdmins()` server-side | ✅ | ✅ |
| `/api/colors/submit` | `sendPushToAdmins()` server-side | ✅ | ✅ |

> ⚠️ A falha na notificação (push ou in-app) **nunca bloqueia** o processo principal. Todas as chamadas são envolvidas em `try/catch` isolados.

---

## Relacionados
- [[Webhook ClickOne]]
- [[Change Orders]]
- [[Projects]]
- [[Customer Portal]]
- [[Documentos e Contratos Digitais]]
- [[Field App]]
- [[Design System]]
- [[Weather Card — Previsão por Projeto]]
