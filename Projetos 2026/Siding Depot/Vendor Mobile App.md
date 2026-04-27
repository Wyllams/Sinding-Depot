---
tags:
  - vendor-mobile
  - siding-depot
  - mobile
  - vendedor
created: 2026-04-27
---

# 📱 Vendor Mobile App — Acesso do Vendedor

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota base:** `/mobile/sales`  
**Perfil:** `salesperson`  
**Stack:** Next.js (App Router) + Supabase + Tailwind CSS + Material Symbols

---

## Arquitetura de Navegação

```
/mobile/sales
├── page.tsx              ← HOME / Dashboard
├── customers/
│   └── page.tsx          ← Clientes do mês
├── requests/
│   └── page.tsx          ← Change Orders (Crew → Vendedor → Cliente)
├── calendar/
│   └── page.tsx          ← Calendário semanal
├── projects/
│   └── page.tsx          ← (acesso secundário, não está no nav)
├── orders/
│   └── page.tsx          ← (acesso secundário, não está no nav)
└── profile/
    └── page.tsx          ← Perfil do vendedor
```

---

## Bottom Navigation (Menu Inferior)

**Fixo em todas as telas** — definido localmente em cada `page.tsx` como:

```typescript
const SALES_NAV = [
  { icon: "dashboard",  label: "Dashboard", href: "/mobile/sales" },
  { icon: "group",      label: "Customers", href: "/mobile/sales/customers" },
  { icon: "assignment", label: "Requests",  href: "/mobile/sales/requests" },
];
```

> ⚠️ **Regra:** O calendário **NÃO entra no nav**. É acessado apenas via card "My Schedule" na HOME.

---

## Tela 1 — Dashboard (HOME)

**Arquivo:** `web/app/mobile/sales/page.tsx`

### Componentes

#### Header
- Botão hambúrguer (≡) → dropdown com "My Profile", "Calendar", "Sign Out"
- Título "SIDING DEPOT" centralizado
- Avatar do vendedor (iniciais ou foto real) → link para `/profile`

#### Card "Monthly Quota"
- Meta fixa: **$150.000/mês**
- Calcula em tempo real:
  ```
  Receita do mês = Σ jobs.contract_amount (signed este mês, deste vendedor)
                 + Σ change_orders.approved_amount (approved este mês, deste vendedor)
  ```
- Barra de progresso colorida
- Texto: "X to go" ou "Goal reached! 🎉"

#### Card "Customers This Month"
- Contagem real de jobs fechados no mês
- Clique → `/mobile/sales/customers`

#### Card "My Schedule"
- Atalho visual azul com ícone de calendário
- Clique → `/mobile/sales/calendar`

### Identidade do Vendedor (loadIdentity)
```typescript
1. supabase.auth.getUser()
2. profiles.select("full_name, avatar_url").eq("id", user.id)
3. salespersons.select("id").eq("profile_id", user.id)
   → salespersonId usado em todas as queries de dados
```

---

## Tela 2 — Customers

**Arquivo:** `web/app/mobile/sales/customers/page.tsx`

### O que exibe
- Todos os jobs com `status = 'signed'` assinados no mês atual
- Filtrados pelo `salesperson_id` do vendedor logado
- Busca por nome, número de job, cidade

### Popup do Cliente
- Nome, e-mail, telefone
- Endereço do serviço
- Número e valor do job
- Data de assinatura

### Query
```typescript
supabase.from("jobs")
  .select(`
    id, job_number, contract_amount, contract_signed_at,
    service_address_line_1, city, state,
    customer:customers (full_name, email, phone)
  `)
  .eq("salesperson_id", salespersonId)
  .eq("status", "signed")
  .gte("contract_signed_at", startOfMonth)
  .lte("contract_signed_at", endOfMonth)
```

---

## Tela 3 — Requests (Change Orders)

**Arquivo:** `web/app/mobile/sales/requests/page.tsx`

### O que exibe
- Todas as `change_orders` dos jobs do vendedor
- Independente de mês — mostra histórico completo
- Filtro de busca por título, cliente, número do job

### Query (com FK hints obrigatórios)
```typescript
supabase.from("change_orders")
  .select(`
    id, title, description, status,
    proposed_amount, approved_amount,
    rejection_reason, requested_at, decided_at, job_service_id,
    job:jobs (id, job_number, customer:customers (full_name)),
    job_service:job_services!change_orders_job_service_id_fkey (
      service_type:service_types (name)
    ),
    requested_by_profile:profiles!change_orders_requested_by_profile_id_fkey (full_name),
    items:change_order_items (
      id, description, amount, sort_order,
      change_order_attachments (id, file_name, url, mime_type, change_order_item_id)
    ),
    attachments:change_order_attachments (id, file_name, url, mime_type, change_order_item_id)
  `)
  .in("job_id", jobIds)
  .order("created_at", { ascending: false })
```

### Fluxo de Ações no Popup

| Status | Ação disponível | Função |
|---|---|---|
| `draft` | Send to Customer + Save as Draft | `handleSendToCustomer()` / `handleSaveDraft()` |
| `pending_customer_approval` | Reenviar + Save as Draft | `handleSendToCustomer()` / `handleSaveDraft()` |
| `approved` | Confirm Approval | `handleDecision("approved")` |
| `rejected` | Confirm Rejection | `handleDecision("rejected")` |
| `cancelled` | Nenhuma ação | — |

### `handleSendToCustomer()` — detalhes
```typescript
// Valida proposed_amount > 0 (obrigatório)
// Atualiza no banco:
{
  title, description,
  proposed_amount: Number(editProposed),
  status: "pending_customer_approval",
  reviewed_by: userId,
  reviewed_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
// → Cliente passa a ver no portal dele
```

---

## Tela 4 — Calendar

**Arquivo:** `web/app/mobile/sales/calendar/page.tsx`

### O que exibe
- Calendário semanal (navegação prev/next week)
- `service_assignments` com `scheduled_start_at` não nulo
- Blocos de serviço posicionados na coluna do dia correspondente
- Popup com detalhes: status, crew, endereço, cliente, duração

### Acesso
- Via card "My Schedule" na HOME
- Via menu hambúrguer → "Calendar"
- **Não aparece no bottom nav**

---

## Segurança e RLS

### Salesperson só vê seus dados
Todo dado é filtrado por `salesperson_id`:
1. A identidade é resolvida: `profiles → salespersons` (via `profile_id`)
2. Todos os jobs são filtrados: `.eq("salesperson_id", salespersonId)`
3. Change Orders são filtradas via `job_id IN (jobIds do vendedor)`

### RLS do banco (redundância)
A policy `change_orders_salesperson_all` no PostgreSQL garante restrição mesmo que o frontend falhe:
```sql
EXISTS (
  SELECT 1 FROM jobs
  JOIN salespersons ON salespersons.id = jobs.salesperson_id
  WHERE jobs.id = change_orders.job_id
    AND salespersons.profile_id = auth.uid()
)
```

---

## Padrões de UI

- **Fundo:** `#080808` (dark)
- **Accent:** `#aeee2a` (verde-lima / `primary`)
- **Fonte:** Manrope + system-ui
- **Cards:** `bg-surface-container-low` com `border-outline-variant/20`
- **Badges de status:** texto e fundo coloridos, tipagem pequena uppercase
- **Popups:** bottom sheet com `max-h-[92dvh]`, backdrop blur
- **Ícones:** Material Symbols Outlined
- **Animação:** `animate-in slide-in-from-bottom` nos sheets

---

## Changelog

- **2026-04-27** — Criação do Vendor Mobile App: Dashboard, Customers, Requests, fluxo Send to Customer, fix FK hints, fotos por item. Ver [[Changelog 2026-04-27]].

---

## Relacionados
- [[Change Orders]]
- [[Field App]]
- [[Customer Portal]]
- [[Autenticação e Controle de Acesso]]
- [[Design System]]
