---
tags:
  - auth
  - rbac
  - siding-depot
  - segurança
created: 2026-04-17
---

# 🔐 Autenticação e Controle de Acesso

> Voltar para [[🏗️ Siding Depot — Home]]

---

## Fluxo de Login

| Tipo de Usuário | Método |
|-----------------|--------|
| **Staff (Admin, Sales)** | Email + Password (Supabase Auth) |
| **Customer** | Username + Password gerado automaticamente pelo [[Webhook ClickOne]] |

---

## Páginas de Auth

| Rota | Função |
|------|--------|
| `/login` | Tela de login com seleção de papel |
| `/forgot-password` | Recuperação de senha via email |
| `/reset-password` | Redefinição de senha com token |

---

## RBAC (Role-Based Access Control)

Roles são armazenados na tabela `profiles.role` no [[Banco de Dados]].

| Role | Acesso | Módulos |
|------|--------|---------|
| `admin` | Total | Todos os módulos |
| `salesperson` | Parcial | [[Dashboard]], [[Projects]], [[Sales Reports]], [[Job Schedule]] |
| `partner` | Campo | [[Field App]], jobs atribuídos |
| `customer` | Portal | [[Customer Portal]] (read-only) |

### Middleware
- Next.js Middleware redireciona baseado em role
- Proteção de rotas server-side
- Gerenciamento via [[Settings]] (Users & Permissions)

---

## Customer Portal Credentials

Quando um lead chega via [[Webhook ClickOne]], o sistema auto-gera:

| Campo | Formato | Exemplo |
|-------|---------|---------|
| **Username** | `FirstName_LastName` | `Nick_Magalhaes` |
| **Password** | `FirstNameX*Year` | `NickM*2026` |
| **Portal Email** | `username@customer.sidingdepot.app` | `nick_magalhaes@customer.sidingdepot.app` |

O email de boas-vindas é enviado automaticamente via **Resend API**.

---

## Relacionados
- [[Settings]]
- [[Webhook ClickOne]]
- [[Customer Portal]]
- [[Banco de Dados]]
