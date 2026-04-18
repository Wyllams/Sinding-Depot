---
tags:
  - new-project
  - siding-depot
  - formulário
created: 2026-04-17
---

# ➕ New Project — Criação de Projeto

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `/new-project`

---

## Formulário Multi-Step

| Seção | Campos |
|-------|--------|
| **Customer Info** | Nome, Email, Telefone |
| **Address** | Endereço, Cidade, Estado, CEP |
| **Services Carousel** | Seleção visual de serviços |
| **Scope of Work** | Descrição do escopo por serviço |
| **Partner/Crew Assignment** | Seleção de crew por serviço |
| **Contract** | Valor do contrato, data de assinatura |
| **Salesperson** | Quem vendeu (Matheus, Ruby) |
| **Gate Status** | Status inicial de bloqueio |

---

## Serviços Disponíveis

| Serviço | Ícone | Partners Disponíveis |
|---------|-------|---------------------|
| **Siding** | `view_day` | Siding Depot, Xicara, Xicara 2, Wilmar, Wilmar 2, Sula, Luis |
| **Gutters** | `horizontal_rule` | Siding Depot, Leandro |
| **Painting** | `format_paint` | Siding Depot, Osvin, Osvin 2, Victor, Juan |
| **Windows** | `window` | Siding Depot, Sergio |
| **Decks** | `deck` | Siding Depot |
| **Roofing** | `roofing` | Siding Depot, Josue |
| **Dumpster** | `delete` | Siding Depot |

---

## Automações na Criação

| Automação | Detalhe |
|-----------|---------|
| **Job Number** | Gera automaticamente `SD-YYYY-XXXX` |
| **Job Services** | Cria registro em `job_services` para cada serviço selecionado |
| **Service Assignments** | Cria `service_assignments` para cada crew atribuído |
| **Window Order** | Se Windows/Doors selecionado → cria `window_order` automático → [[Windows e Doors Tracker]] |
| **Notificação** | Insere na tabela `notifications` → [[Notificações em Tempo Real]] |
| **Siding + Paint** | Se Siding selecionado → adiciona Painting automaticamente |

---

## Relacionados
- [[Projects]]
- [[Crews e Partners]]
- [[Windows e Doors Tracker]]
- [[Banco de Dados]]
