---
tags:
  - customer-portal
  - siding-depot
  - portal
  - cliente
created: 2026-04-17
---

# 🏠 Customer Portal — Portal do Cliente

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `/customer`

---

## Visão Geral

Layout dedicado sem Sidebar administrativa. Acesso restrito a usuários com `role = customer` → [[Autenticação e Controle de Acesso]].

Credenciais geradas automaticamente pelo [[Webhook ClickOne]].

---

## Módulos do Portal

| Rota | Funcionalidade |
|------|----------------|
| `/customer` | Dashboard do cliente com overview do projeto |
| `/customer/documents` | [[Documentos e Contratos Digitais]] para visualização/assinatura |
| `/customer/change-orders` | [[Change Orders]] para aprovação |
| `/customer/colors` | Seleção de cores e materiais |

---

## Acesso

| Campo | Formato |
|-------|---------|
| **Username** | `FirstName_LastName` |
| **Password** | `FirstNameX*Year` |
| **Login** | `/login?role=customer` |

---

## Funcionalidades

- **View-only** de status do projeto
- **Assinatura digital** de Job Start e Completion Certificates
- **Aprovação/Rejeição** de Change Orders
- **Seleção de Cores** para materiais

---

## Relacionados
- [[Webhook ClickOne]]
- [[Autenticação e Controle de Acesso]]
- [[Change Orders]]
- [[Documentos e Contratos Digitais]]
