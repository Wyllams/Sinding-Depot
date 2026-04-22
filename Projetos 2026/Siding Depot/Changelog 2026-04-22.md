---
tags:
  - changelog
  - siding-depot
  - 2026-04-22
created: 2026-04-22
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

---

## 🐛 Bug Fixes

### 7. Month Picker no Schedule (Corrigido)

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

---

## Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `api/webhook/clickone/route.ts` | Close_date, status pending, no auto-assignment |
| `projects/[id]/page.tsx` | Guard removido de atribuição manual |
| `projects/page.tsx` | Tentative → Pending (vermelho) |
| `schedule/page.tsx` | Status labels, cores, month picker fix |
| `crews/page.tsx` | Guard removido de atribuição manual |
| `lib/scheduling-flag.ts` | Flag central de pausa |

---

## Relacionados
- [[Webhook ClickOne]]
- [[Job Schedule]]
- [[Field App]]
- [[Projects]]
- [[Crews e Partners]]
