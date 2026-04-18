---
tags:
  - cash-payments
  - siding-depot
  - financeiro
created: 2026-04-17
---

# 💵 Cash Payments — Pagamentos em Dinheiro

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `/cash-payments`

---

## Funcionalidades

| Feature | Detalhes |
|---------|----------|
| **Registro de Pagamentos** | Data, Job, Store, Valor, Employee, Notas |
| **Manage Stores** | CRUD completo de lojas com cor customizável |
| **Filtros** | Por Store, Employee, Mês/Ano, busca textual |
| **KPIs** | Total filtrado, quantidade, stores e employees usados |
| **Edição** | Modal de edição com todos os campos |
| **Navegação Mensal** | Setas prev/next com seletores dropdown |

---

## Stores Integradas

Stores dinâmicas carregadas em tempo real do [[Banco de Dados]]:
- Nome (uppercase automático)
- Cor customizável (color picker)
- Soft delete (`active = false`)

---

## Employees Fixos

```
XICARA, XICARA2, WILMAR, WILMAR2, SULA, LUIS,
SERGIO, OSVIN, OSVIN2, VICTOR, JUAN, LEANDRO, JOSUE
```

> [!NOTE]
> Compartilham a mesma lista de [[Crews e Partners]].

---

## Relacionados
- [[Projects]]
- [[Crews e Partners]]
- [[Sales Reports]]
