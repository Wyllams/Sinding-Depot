---
tags:
  - sales-reports
  - siding-depot
  - financeiro
  - metas
  - vendas
created: 2026-04-17
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
