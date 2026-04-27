---
tags:
  - changelog
  - siding-depot
  - vendor-mobile
  - change-orders
  - mobile-sales
date: 2026-04-27
---

# 🚀 Changelog — 27 de Abril de 2026

Este documento registra todas as modificações realizadas no **Acesso Mobile do Vendedor** (`/mobile/sales`). O foco da sessão foi: modernizar o dashboard do vendedor, unificar a navegação, implementar o fluxo completo de **Change Orders** (Crew → Vendedor → Cliente) e corrigir bugs críticos de query no Supabase.

> Commits desta sessão: `866f39d`, `1ccf6a1`, `d321e8e`, `34675a6`, `9afb039`, `2ae9cf1`

---

## 1. Reestruturação do Dashboard do Vendedor (`mobile/sales/page.tsx`)

### O que foi feito
O dashboard (HOME) do vendedor foi completamente modernizado com:

1. **Nome dinâmico do vendedor** — Exibe o nome real buscado da tabela `profiles` (campo `full_name`) ao invés de um texto fixo.
2. **Avatar com iniciais** — Usa `ui-avatars.com` com as iniciais do vendedor; substitui por foto real se `avatar_url` existir.
3. **Card "Monthly Quota" em tempo real** — Meta mensal fixa de $150.000. Calcula o quanto já foi vendido no mês atual somando:
   - `contract_amount` de todos os `jobs` com `status = 'signed'` do mês
   - `approved_amount` de todas as `change_orders` com `status = 'approved'` do mês
   - Exibe barra de progresso visual e o valor restante para bater a meta.
4. **Card "Customers This Month"** — Mostra o número de clientes fechados no mês atual (jobs assinados). Funciona como atalho direto para `/mobile/sales/customers`.
5. **Card "My Schedule"** — Novo card que leva direto ao calendário do vendedor (`/mobile/sales/calendar`) sem precisar ir ao menu.
6. **Remoção do card "My Sales YTD"** — Removido por não agregar valor prático ao fluxo diário.

### Por que foi feito
O vendedor precisa de informações de metas em tempo real ao abrir o app, sem precisar navegar. Os cards de atalho reduzem o número de taps para acessar as telas mais usadas.

### Arquivos modificados
- `web/app/mobile/sales/page.tsx`

---

## 2. Unificação da Navegação (`MobileBottomNav`)

### O que foi feito
O menu inferior (bottom navigation) foi **padronizado em todas as páginas** do vendedor para ter exatamente 3 itens:

| Ícone | Label | Rota |
|---|---|---|
| `dashboard` | Dashboard | `/mobile/sales` |
| `group` | Customers | `/mobile/sales/customers` |
| `assignment` | Requests | `/mobile/sales/requests` |

**Itens removidos do nav:** Projects, Orders, Calendar — esses itens eram do nav antigo e causavam confusão.

**Calendário:** Acessível apenas via card "My Schedule" na HOME — não fica no menu.

### Páginas corrigidas
Todas as páginas abaixo tinham o nav antigo (com Projects, Orders, Calendar) e foram corrigidas:

- `web/app/mobile/sales/calendar/page.tsx`
- `web/app/mobile/sales/orders/page.tsx`
- `web/app/mobile/sales/projects/page.tsx`
- `web/app/mobile/sales/requests/page.tsx`
- `web/app/mobile/sales/customers/page.tsx`
- `web/app/mobile/sales/profile/page.tsx`

### Por que foi feito
O vendedor reportou que ao entrar na tela de Calendário, o menu mudava completamente (apareciam ícones de Projects e Orders). A causa era que cada página definia seu próprio array `SALES_NAV` localmente com itens diferentes. A padronização garante que o menu nunca mude independente de qual tela o vendedor esteja.

---

## 3. Nova Página: Customers (`mobile/sales/customers/page.tsx`)

### O que foi feito
Criada a página `/mobile/sales/customers` que exibe todos os **clientes fechados no mês atual** pelo vendedor.

**Funcionalidades:**
- Lista de cards com nome do cliente, número do job, valor do contrato, data de assinatura
- Barra de busca (por nome, número, cidade)
- Popup ao clicar no card com todas as informações do cliente:
  - Nome completo, e-mail, telefone
  - Endereço do serviço
  - Número e valor do job
  - Data de assinatura

### Lógica de dados
```
1. Busca salesperson_id via profiles → salespersons
2. Busca jobs WHERE salesperson_id = meu_id
     AND status = 'signed'
     AND DATE_TRUNC('month', contract_signed_at) = mês atual
3. Junta com customers para nome/contato
```

### Arquivos criados
- `web/app/mobile/sales/customers/page.tsx`

---

## 4. Nova Página: Requests (`mobile/sales/requests/page.tsx`)

### O que foi feito
Criada a página `/mobile/sales/requests` — substitui o antigo "Profile" no menu. É o centro de gestão de **Change Orders** do vendedor.

**Funcionalidades:**
- Lista todas as COs dos jobs do vendedor (scoped por `salesperson_id`)
- Barra de busca por título, cliente, número do job
- Badge de status com cores distintas por estado
- Popup detalhado ao clicar em uma CO

### Popup da Change Order — Estrutura detalhada

O popup exibe na ordem:
1. **Badge de status** + número do job + nome do cliente
2. **Solicitado por** (nome do crew que criou) + data
3. **Título** (editável)
4. **Descrição** (editável)
5. **Proposed Value** — campo numérico para o vendedor definir o valor
6. **ITEMS** — lista numerada de todos os `change_order_items`, cada um com:
   - Número sequencial (1, 2, 3...)
   - Descrição do item
   - Valor do item (se houver)
   - **Grid de fotos** do item (3 colunas) linkadas para abertura em nova aba
7. **Other Files** — anexos que não pertencem a nenhum item específico
8. **Botões de ação** (ver seção 5)

### Arquivos criados
- `web/app/mobile/sales/requests/page.tsx`

---

## 5. Fluxo Completo de Change Orders: Crew → Vendedor → Cliente

### Problema anterior
O fluxo estava incompleto: o Crew enviava a CO, o vendedor via, podia editar e salvar — mas **o cliente nunca recebia**. O status não mudava automaticamente para `pending_customer_approval`.

### Fluxo implementado

```
CREW cria CO (status: draft)
    ↓
VENDEDOR recebe na tela de Requests
VENDEDOR revisa os itens e fotos
VENDEDOR define o "Proposed Value"
VENDEDOR clica "Send to Customer"
    ↓
status → pending_customer_approval
reviewed_by = userId do vendedor
reviewed_at = now()
    ↓
CLIENTE vê a CO no seu portal
CLIENTE aprova ou rejeita
    ↓
status → approved / rejected
```

### Três handlers de ação implementados

#### `handleSaveDraft()`
- Salva apenas `title`, `description`, `proposed_amount`
- **NÃO muda o status** — fica como draft
- Usado quando o vendedor quer rascunhar sem enviar ainda

#### `handleSendToCustomer()`
- Valida que `proposed_amount > 0` (obrigatório)
- Salva `title`, `description`, `proposed_amount`
- **Muda status para `pending_customer_approval`**
- Registra `reviewed_by` e `reviewed_at`
- O cliente passa a ver a CO no portal dele

#### `handleDecision(decision: "approved" | "rejected")`
- Usado quando o cliente já respondeu e o vendedor precisa registrar
- `approved`: salva `approved_amount` + `decided_at`
- `rejected`: salva `rejection_reason` + `decided_at`

### Botões context-aware (por status)

| Status atual da CO | Botões exibidos |
|---|---|
| `draft` | 🟢 **Send to Customer** (primário) + **Save as Draft** (secundário) |
| `pending_customer_approval` | 🟢 **Send to Customer** (reenviar) + **Save as Draft** |
| `approved` | Banner verde "Customer Approved ✓" + **Confirm Approval** |
| `rejected` | Banner vermelho "Customer Rejected" + **Confirm Rejection** |
| `cancelled` | Banner cinza "Cancelled" — sem ações |

### Arquivos modificados
- `web/app/mobile/sales/requests/page.tsx`

---

## 6. Correção Crítica: Query de Change Orders Falhava Silenciosamente

### Problema
As change orders **não apareciam** na tela de Requests. A página carregava mas ficava vazia.

### Causa raiz
A tabela `change_orders` possui **duas Foreign Keys para `profiles`**:
- `requested_by_profile_id` → `profiles.id`
- `reviewed_by` → `profiles.id`

Quando o Supabase recebe `profiles (full_name)` sem especificar qual FK usar, ele **abortava a query em silêncio** (retornava erro sem lançar exceção no try/catch original).

O mesmo problema ocorria com `job_services` — há ambiguidade sem o hint de FK.

### Solução
Adicionados **hints explícitos de FK** usando a sintaxe `!nome_da_constraint`:

```typescript
// ANTES (falhava silenciosamente)
requested_by_profile:profiles (full_name)
job_service:job_services (service_type:service_types (name))

// DEPOIS (funciona corretamente)
requested_by_profile:profiles!change_orders_requested_by_profile_id_fkey (full_name)
job_service:job_services!change_orders_job_service_id_fkey (service_type:service_types (name))
```

### FKs verificadas no Supabase
```sql
-- change_orders → profiles
change_orders_requested_by_profile_id_fkey  (requested_by_profile_id)
change_orders_reviewed_by_fkey              (reviewed_by)

-- change_orders → job_services
change_orders_job_service_id_fkey           (job_service_id)
```

### Query de fallback
Adicionada query de fallback mais simples (sem joins de serviço) caso a query principal ainda falhe por qualquer motivo. Garante que os dados apareçam mesmo em cenários degradados.

### Arquivos modificados
- `web/app/mobile/sales/requests/page.tsx`

---

## 7. Items e Fotos por Item no Popup de Change Order

### O que foi feito
O popup de CO agora exibe os `change_order_items` de forma **separada e numerada**, com as fotos vinculadas ao item correto.

### Estrutura das tabelas relevantes
```
change_orders
  └── change_order_items
        ├── id, description, amount, sort_order
        └── change_order_attachments
              ├── id, file_name, url, mime_type
              └── change_order_item_id (FK → change_order_items)
```

### Como os dados são organizados
1. Query busca `change_order_items` com seus `change_order_attachments` aninhados
2. Items são ordenados por `sort_order` no frontend
3. Para cada item, filtramos as fotos onde `change_order_item_id === item.id`
4. Fotos sem `change_order_item_id` (orfãs) aparecem em seção separada "Other Files"

### Renderização por item
```
[1] Descrição do item  →  $valor
    📷 📷 📷  (grid 3 colunas, clicáveis)

[2] Descrição do item  →  $valor
    📷 📷
```

### Detecção automática de imagem
Função `isImage(url)` detecta extensões `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic` para renderizar `<img>` ou ícone de arquivo.

### Arquivos modificados
- `web/app/mobile/sales/requests/page.tsx`

---

## Resumo Técnico — Arquivos

| Arquivo | Tipo de Mudança | Status |
|---|---|---|
| `mobile/sales/page.tsx` | Dashboard com meta, cards, nome dinâmico | ✅ Deploy |
| `mobile/sales/customers/page.tsx` | Nova página — clientes do mês | ✅ Deploy |
| `mobile/sales/requests/page.tsx` | Nova página — Change Orders com fluxo completo | ✅ Deploy |
| `mobile/sales/calendar/page.tsx` | Fix nav — removido Projects/Orders/Calendar | ✅ Deploy |
| `mobile/sales/orders/page.tsx` | Fix nav — atualizado para 3 itens | ✅ Deploy |
| `mobile/sales/projects/page.tsx` | Fix nav — removido Projects do próprio nav | ✅ Deploy |

## Commits

| Hash | Descrição |
|---|---|
| `866f39d` | Estrutura inicial do vendor mobile (HOME, nav, Customers, Requests básico) |
| `1ccf6a1` | CO items com fotos por item no popup + contador real de clientes na HOME |
| `d321e8e` | Card "My Schedule" na HOME linkando ao calendário |
| `34675a6` | Fix nav: unificado para Dashboard/Customers/Requests em todas as páginas |
| `9afb039` | Fix crítico: FK hints na query de change_orders + fallback query |
| `2ae9cf1` | Fluxo Send to Customer: saveDraft + sendToCustomer + handleDecision |

## RLS de Change Orders (verificada)

A policy `change_orders_salesperson_all` já estava correta e garante que o vendedor vê apenas as COs dos seus próprios jobs:

```sql
(EXISTS (
  SELECT 1
  FROM jobs
  JOIN salespersons ON salespersons.id = jobs.salesperson_id
  WHERE jobs.id = change_orders.job_id
    AND salespersons.profile_id = auth.uid()
))
```

---

## Relacionados
- [[Change Orders]]
- [[Customer Portal]]
- [[Field App]]
- [[Sales Reports]]
- [[Autenticação e Controle de Acesso]]
