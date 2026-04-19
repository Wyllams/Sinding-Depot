---
tags:
  - auth
  - rbac
  - siding-depot
  - segurança
created: 2026-04-17
updated: 2026-04-19
---

# 🔐 Autenticação e Controle de Acesso

> Voltar para [[🏗️ Siding Depot — Home]]

---

## Fluxo de Login

| Tipo de Usuário | Método |
|-----------------|--------|
| **Staff (Admin, Sales)** | Email + Password (Supabase Auth) |
| **Customer** | Username + Password gerado automaticamente (via [[Webhook ClickOne]] ou [[New Project]]) |

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

### Onde o portal é criado

| Origem | Como |
|--------|------|
| **Webhook ClickOne** | Inline no handler (`app/api/webhook/clickone/route.ts`) |
| **New Project (admin)** | Via `POST /api/customers/create-portal` |

> Ambos os caminhos verificam `profile_id` antes de criar, evitando duplicação.

### Configuração Resend

| Env Var | Descrição |
|---------|----------|
| `RESEND_API_KEY` | API Key do Resend para envio de emails |
| `RESEND_FROM` | (Opcional) Sender verificado. Default: `onboarding@resend.dev` |

---

## Relacionados
- [[Settings]]
- [[Webhook ClickOne]]
- [[New Project]]
- [[Customer Portal]]
- [[Credenciais Customer Portal]]
- [[Banco de Dados]]
