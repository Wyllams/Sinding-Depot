---
tags:
  - webhook
  - clickone
  - siding-depot
  - integração
  - crm
  - automação
created: 2026-04-17
updated: 2026-04-19
---

# 🔗 Webhook ClickOne — Integração CRM

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `POST /api/webhook/clickone`

---

## Fluxo Completo

```mermaid
sequenceDiagram
    participant CRM as ClickOne CRM
    participant API as Next.js API Route
    participant DB as Supabase DB
    participant Auth as Supabase Auth
    participant Email as Resend API

    CRM->>API: POST /api/webhook/clickone
    API->>DB: Upsert Customer
    API->>Auth: Create Auth User (customer role)
    API->>DB: Create Profile
    API->>DB: Update Customer (portal credentials)
    API->>Email: Send Welcome Email
    API->>DB: Resolve Salesperson
    API->>DB: Create Job
    API->>DB: Create Job Services
    API->>DB: Create Window Order (if applicable)
    API->>DB: Update Sales Snapshot
    API->>DB: Set contract_signed_at
    API-->>CRM: 200 OK
```

---

## Payloads Suportados

| Campo ClickOne | Mapeamento |
|----------------|------------|
| `full_name` / `client_name` / `first_name + last_name` | → `customers.full_name` |
| `email` | → `customers.email` |
| `phone` | → `customers.phone` |
| `location.fullAddress` / `full_address` / `address` | → Parsing de City/State/ZIP |
| `Nome do Responsavel` / `salesperson` | → Resolução contra `salespersons` |
| `Preço final` / `value` | → `jobs.contract_amount` |
| `Serviço` / `Tipo de Serviço` / `service` | → `job_services` por matching |

---

## Customer Portal Auto-Generation

| Campo | Formato | Exemplo |
|-------|---------|---------|
| **Username** | `FirstName_LastName` | `Nick_Magalhaes` |
| **Password** | `FirstNameX*Year` | `NickM*2026` |
| **Portal Email** | `username@customer.sidingdepot.app` | `nick_magalhaes@customer.sidingdepot.app` |

→ Credenciais enviadas via **Welcome Email** (Resend API)
→ **Proteção contra duplicação:** Verifica `customers.profile_id` antes de criar — se já existir, pula a criação.
→ Veja: [[Customer Portal]] | [[Credenciais Customer Portal]]

---

## Automações Disparadas

| Automação | Módulo relacionado |
|-----------|-------------------|
| Criação de Customer | [[Banco de Dados]] |
| Criação de Auth User | [[Autenticação e Controle de Acesso]] |
| Criação de Job | [[Projects]] |
| Criação de Job Services | [[Projects]] |
| Criação de Window Order | [[Windows e Doors Tracker]] |
| Update Sales Snapshot | [[Sales Reports]] |
| Notificação | [[Notificações em Tempo Real]] |
| Welcome Email | [[Customer Portal]] |

---

## Tratamento de Erros

- Se auth user falhar → job continua (non-blocking)
- Se email falhar → job continua (non-blocking)
- Se job falhar → retorna HTTP 500 com mensagem de erro
- Se customer já tem `profile_id` → pula criação de portal (proteção contra duplicação)

---

## Relacionados
- [[Customer Portal]]
- [[Projects]]
- [[Sales Reports]]
- [[Windows e Doors Tracker]]
- [[Notificações em Tempo Real]]
