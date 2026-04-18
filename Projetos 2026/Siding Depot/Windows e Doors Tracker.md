---
tags:
  - windows-tracker
  - siding-depot
  - tracking
  - pedidos
created: 2026-04-17
---

# 🪟 Windows e Doors Tracker

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `/windows-tracker`

---

## Pipeline de Status

| Status | Cor | Descrição |
|--------|-----|-----------|
| **Measurement** | 🔵 `#60b8f5` | Fase de medição |
| **Ordered** | 🟡 `#e3eb5d` | Pedido feito ao fornecedor |
| **In Production** | 🟢 `#aeee2a` | Em fabricação |
| **Shipped** | 🟣 `#a855f7` | Enviado |
| **Delivered** | ✅ `#22c55e` | Entregue no canteiro |
| **Cancelled** | 🔴 `#ff7351` | Cancelado |

---

## Funcionalidades

| Feature | Detalhes |
|---------|----------|
| **CRUD Completo** | Criar, editar, deletar pedidos (Supabase-backed) |
| **Regra de Negócio** | ⚠️ Só pode fazer pedido quando `Money Collected = YES` |
| **Money Collected** | YES (verde), NO (vermelho), FINANCING (amarelo) — dropdown inline |
| **Supplier** | Dropdown compartilhado com Stores (mesma tabela) |
| **Inline Edits** | Status, Money Collected, Deposit, Ordered On, Expected Delivery |
| **Datas** | DatePicker customizado com variante "ghost" para edição inline |
| **Delete Confirmation** | Modal de confirmação antes de deletar |
| **KPIs** | Total Orders, In Production, Measurement, Blocked (No $) |

---

## Automação

> [!IMPORTANT]
> Quando um job é criado via [[Webhook ClickOne]] com serviço "Windows" ou "Doors", um `window_order` é criado **automaticamente** com:
> - Status: `Measurement`
> - Money Collected: `NO`

Também criado automaticamente pelo formulário [[New Project]] quando Windows/Doors é selecionado.

---

## Schema no [[Banco de Dados]]

Tabela: `window_orders`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `job_id` | FK | → `jobs` |
| `customer_name` | text | Nome do cliente |
| `status` | text | Pipeline status |
| `money_collected` | text | YES / NO / FINANCING |
| `quantity` | int | Quantidade |
| `quote` | decimal | Valor do orçamento |
| `deposit` | decimal | Depósito pago |
| `ordered_on` | date | Data do pedido |
| `expected_delivery` | date | Previsão de entrega |
| `supplier` | text | Fornecedor |
| `order_number` | text | Número do pedido |

---

## Relacionados
- [[Projects]]
- [[Webhook ClickOne]]
- [[New Project]]
- [[Crews e Partners]]
