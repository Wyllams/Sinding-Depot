---
tags:
  - sales-reports
  - siding-depot
  - financeiro
  - metas
  - vendas
created: 2026-04-17
updated: 2026-04-19
---

# 📈 Sales Reports — Relatórios de Vendas

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `/sales-reports`

---

## Módulos

| Módulo | Funcionalidade |
|--------|----------------|
| **KPI Strip** | Total Goal, Total Sold, Total Jobs, Average Ticket |
| **Progress Bars** | Progresso individual por vendedor vs. meta |
| **Monthly Performance** | Accordion mensal com evolução de vendas |
| **Annual Grid** | Visão 12 meses lado a lado |
| **Leaderboard** | Ranking competitivo entre vendedores |
| **Goal Setting** | Definição de metas por período |

---

## Performance by Salesperson (Accordion)

Ao expandir o card de um vendedor, exibe a tabela de jobs com as seguintes colunas:

| Coluna | Fonte | Descrição |
|--------|-------|-----------|
| **Data** | `contract_signed_at` ou `created_at` | Data do contrato (formato pt-BR) |
| **Client** | `customers.full_name` (join) | Nome do cliente associado ao job |
| **Service** | `job_services → service_types.name` | Badges verdes com cada serviço |
| **Valor** | `jobs.contract_amount` | Valor do contrato (cor do vendedor) |
| **Status** | `jobs.status` | Ícone de status (cancelled = riscado + opacidade) |

> [!NOTE]
> O grid usa `grid-cols-[90px_1fr_120px_90px_50px]` para layout equilibrado das 5 colunas.

### Campos do Vendedor no Card

| Campo | Layout |
|-------|--------|
| **Salesperson** + **Contract Value** + **SQ** | 3 campos lado a lado (33% cada) |

---

## Timeframes de Metas

| Período | Cálculo |
|---------|---------|
| **Weekly** | Meta semanal dividida ou definida |
| **Monthly** | Meta mensal exata ou rateada |
| **Quarterly** | Trimestral (3 meses) |
| **Semiannual** | Semestral (6 meses) |
| **Annual** | Anual (12 meses) |

> [!NOTE]
> Quando uma meta exata é definida para um período, ela é usada diretamente.
> Quando não há meta específica, o valor é rateado da meta de maior escopo.

---

## Fonte de Dados no [[Banco de Dados]]

| Tabela | Função |
|--------|--------|
| `salespersons` | Cadastro de vendedores |
| `sales_goals` | Metas por período e vendedor |
| `sales_snapshots` | Snapshots mensais de performance (atualizado via [[Webhook ClickOne]]) |
| `jobs` | Contratos fechados com `contract_signed_at`, `contract_amount`, `salesperson_id` |
| `customers` | Nome do cliente (join via `customer_id`) |
| `job_services` → `service_types` | Serviços do job (join para badges) |

---

## Filtros

- Filtragem por vendedor (exclui "Armando" da visualização)
- Navegação mensal com setas
- Seletor de Timeframe

---

## Relacionados
- [[Dashboard]]
- [[Projects]]
- [[Webhook ClickOne]]
