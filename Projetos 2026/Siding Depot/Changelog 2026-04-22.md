---
tags:
  - changelog
  - siding-depot
  - 2026-04-22
created: 2026-04-22
updated: 2026-04-22
---

# 📋 Changelog — 22 de Abril de 2026

> Voltar para [[🏗️ Siding Depot — Home]]

---

## 🔴 Mudanças Críticas

### 1. Atribuição Manual de Parceiros (Permanente)

O sistema **não atribui mais parceiros/crews automaticamente**. Toda atribuição é feita pelo Admin (Nick) manualmente:

| Componente | Antes | Agora |
|------------|-------|-------|
| **Webhook ClickOne** | Atribuía crew default automaticamente | ❌ Não atribui — admin faz manualmente |
| **New Project** | Atribuía crew default automaticamente | ⏸️ Pausado (flag `SCHEDULING_PAUSED`) |
| **Admin seleciona parceiro** | ❌ Bloqueado pelo pause | ✅ **Funciona normalmente** |
| **Crews page (manual)** | ❌ Bloqueado pelo pause | ✅ **Funciona normalmente** |

**Fluxo:** Webhook cria Job + Services → Admin abre projeto → Admin seleciona parceiro → Sistema cria agendamento com cascade completa.

### 2. Status "Tentative" → "Pending" (Vermelho)

| Antes | Agora |
|-------|-------|
| `draft` → "Tentative" (🟡 amarelo) | `draft` → **"Pending"** (🔴 vermelho) |

Atualizado em: Projects page, Schedule page (cards, legenda, popup, dropdown)

### 3. Webhook: Status Padrão = `pending`

Jobs criados via webhook agora entram com `status: "pending"` (antes era `"draft"`). Na UI, ambos aparecem como "Pending" vermelho.

---

## 🆕 Novas Features

### 4. Close Date → Sold Date

O campo `Close_date` do ClickOne agora é capturado pelo webhook e salvo em `jobs.contract_signed_at` (Sold Date):

- Busca em: `Close_date`, `close_date`, `CloseDate`, `Close Date`
- Se não encontrar, usa data de hoje como fallback

### 5. Solicitação de Material Extra (Portal Parceiro)

Parceiros podem solicitar material extra diretamente pelo portal de campo:

| Campo | Tipo |
|-------|------|
| Material Name | text |
| Quantity | integer |
| Size | text |
| Note | text (justificativa) |

- Salvo na tabela `extra_material_requests` com status `pending`
- Admin vê e aprova/rejeita no "Extra Material" do projeto

### 6. Portal Parceiro — My Jobs com Dados Reais

Corrigido para puxar informações reais do banco via RLS:
- Jobs atribuídos ao parceiro logado
- Nome do cliente, endereço, serviços, datas, contrato, SQ

### 7. 🔔 Push Notifications (PWA) — Ativadas

Sistema completo de **notificações push** para desktop e mobile, independente de ter o site aberto:

| Evento | Notificação | Arquivo |
|--------|-------------|---------|
| 📋 **Novo Projeto** (webhook) | `"New Project from ClickOne"` | `webhook/clickone/route.ts` |
| ✍️ **Documento Assinado** (cliente) | `"Document Signed"` | `documents/sign/route.ts` |
| 📝 **Change Order Criada** | `"New Change Order"` | `change-orders/page.tsx` |
| 📦 **Material Extra Solicitado** (parceiro) | `"Extra Material Request"` | `field/jobs/[id]/page.tsx` |
| 🎨 **Cores Submetidas** | Já existia ✅ | `colors/submit/route.ts` |
| 🎨 **Edição de Cores** | Já existia ✅ | `colors/request-edit/route.ts` |

**Infraestrutura criada:**

| Arquivo | Função |
|---------|--------|
| `lib/send-push.ts` | Helper centralizado — envia push + notificação in-app para admins |
| `api/push/notify/route.ts` | API interna para frontend disparar notificações server-side |
| `components/pwa/PushNotificationInit.tsx` | Wrapper client — registra SW + solicita permissão ao usuário |

**Como funciona:**
1. Usuário acessa o site → banner pede permissão de notificação
2. Ao aceitar, subscription é salva na tabela `push_subscriptions`
3. Eventos críticos disparam push via Web Push API (VAPID)
4. Funciona com tela bloqueada e browser fechado (Chrome/Edge)
5. Ideal: instalar como PWA no celular (Add to Home Screen)

**Variáveis de ambiente necessárias:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `PUSH_API_SECRET`
- `NEXT_PUBLIC_SITE_URL`

### 8. New Deck Build — Opção adicionada

Adicionada nova opção **"New Deck Build — 4 days"** no scope de Decks:

| Opção | Dias |
|-------|------|
| Deck Rebuild (Demo) | 5 days |
| Deck Rebuild (W/ Porch) | 10 days |
| **New Deck Build** | **4 days** ← novo |
| Floor Replacement | 4 days |
| Railing | 1 day |

Atualizado em: `new-project/page.tsx` e `projects/[id]/page.tsx`

### 9. 🌤️ Migração do Weather para NWS (National Weather Service)

Fonte de dados meteorológicos migrada do **Open-Meteo** para o **NWS** (fonte oficial do governo americano):

| Aspecto | Antes (Open-Meteo) | Agora (NWS) |
|---------|---------------------|-------------|
| **Fonte** | Modelos globais (ECMWF/GFS) | Estações locais + radares NOAA (oficial US) |
| **Precisão** | Boa | **Máxima para EUA** |
| **Custo** | Gratuito | Gratuito |
| **Fallback** | N/A | Open-Meteo (se NWS falhar) |
| **Cobertura** | Global | Somente EUA (suficiente — Georgia only) |
| **Texto descritivo** | ❌ | ✅ Ex: "Partly Cloudy", "Chance Showers" |
| **Badge de fonte** | ❌ | ✅ Mostra "NWS Official" ou "Open-Meteo" |

**Restrição geográfica:** Busca de cidades filtrada para **somente Georgia, US** — evita resultados de outros estados ou países (ex: México).

**Componentes atualizados:**
- `components/ProjectWeatherCard.tsx` — projeto individual
- `components/WeeklyWeather.tsx` — dashboard global

---

## 🐛 Bug Fixes

### 10. Month Picker no Schedule (Corrigido)

**Bug:** Clicar em "Maio" mostrava "Abril" no seletor.

**Causa raiz:** `getMondayOf(1 de maio)` retornava 27 de abril (Monday da semana que contém dia 1, que podia cair no mês anterior).

**Correção:** Navega para a primeira segunda-feira **dentro** do mês selecionado.

---

## ⏸️ Pausas Ativas

| Feature | Status | Flag |
|---------|--------|------|
| Criação automática de agendamentos | ⏸️ Pausado | `SCHEDULING_PAUSED = true` |
| Welcome Email (Customer Portal) | ⏸️ Pausado | `CUSTOMER_PORTAL_EMAIL_PAUSED = true` |
| Atribuição automática de crew (Webhook) | ❌ Removido permanentemente | N/A |

---

## 📦 Commits

| Hash | Mensagem |
|------|----------|
| `0f07c2f` | feat: pause scheduling, email, close_date mapping |
| `d3f307f` | feat: manual-only partner assignment |
| `ab9803b` | fix: month picker navigating to wrong month |
| `aa26dd1` | feat: rename Tentative to Pending, webhook status |
| `7389147` | style: pending status color changed to red |
| `9befe26` | feat: push notifications for new project, change order, material request, document signed |
| `09556c2` | feat: add New Deck Build scope option (4 days) |
| `8163e33` | feat: migrate weather to NWS for maximum accuracy |
| `753f751` | fix: restrict weather city search to Georgia US only |
| `7c7f54e` | fix: revert to 7-day forecast only |

---

## Arquivos Criados

| Arquivo | Função |
|---------|--------|
| `web/lib/send-push.ts` | Centraliza envio de push + notificação in-app |
| `web/app/api/push/notify/route.ts` | API interna para notificações server-side |
| `web/components/pwa/PushNotificationInit.tsx` | Inicializador de push no layout |

## Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `api/webhook/clickone/route.ts` | Close_date, status pending, no auto-assignment, push notification |
| `api/documents/sign/route.ts` | Push notification ao assinar documento |
| `(shell)/layout.tsx` | Montou `PushNotificationInit` |
| `(shell)/change-orders/page.tsx` | Push notification ao criar change order |
| `field/jobs/[id]/page.tsx` | Push notification ao solicitar material extra |
| `(shell)/new-project/page.tsx` | New Deck Build scope option |
| `projects/[id]/page.tsx` | New Deck Build scope option, Tentative → Pending |
| `projects/page.tsx` | Tentative → Pending (vermelho) |
| `schedule/page.tsx` | Status labels, cores, month picker fix |
| `crews/page.tsx` | Guard removido de atribuição manual |
| `components/ProjectWeatherCard.tsx` | Migrado para NWS, Georgia-only |
| `components/WeeklyWeather.tsx` | Migrado para NWS, Georgia-only |
| `lib/scheduling-flag.ts` | Flag central de pausa |

---

## Relacionados
- [[Webhook ClickOne]]
- [[Job Schedule]]
- [[Field App]]
- [[Projects]]
- [[Crews e Partners]]
- [[Notificações em Tempo Real]]
- [[Weather Card — Previsão por Projeto]]
