---
tags:
  - customer-portal
  - siding-depot
  - credenciais
  - acesso
created: 2026-04-18
updated: 2026-04-19
---

# 🔑 Credenciais do Customer Portal

> Voltar para [[Customer Portal]]

---

## Customer de Teste

| Campo | Valor |
|-------|-------|
| **Customer Name** | Wyllams Bione |
| **Customer ID** | `461b7d53-a134-4508-9b91-87f3cb80e301` |
| **Profile ID (Auth)** | `d5da1065-fdd9-467d-b390-971806e9c4a1` |
| **Job Vinculado** | JOB-597710 (`840e5205-f37f-4bfd-996a-e500f56d6e8b`) |

---

## Credenciais de Acesso

| Campo | Valor |
|-------|-------|
| **Email / Username** | `wyllams_bione@customer.sidingdepot.app` |
| **Password** | `WyllamsB*2026` |
| **URL de Login** | `/login` → botão "Cliente" |

---

## Cadeia de Isolamento de Dados

```
auth.uid() → profiles (role='customer') → customers.profile_id → jobs.customer_id
```

### Fluxo de Resolução

1. Cliente faz login → `auth.uid()` retorna `d5da1065-fdd9-467d-b390-971806e9c4a1`
2. Busca `customers WHERE profile_id = auth.uid()` → retorna customer `461b7d53...`
3. Busca `jobs WHERE customer_id = customer.id` → retorna JOB-597710
4. Todas as sub-queries filtram pelo `job_id` ou `customer_id`

### Tabelas Afetadas

| Tabela | Filtro de Isolamento |
|--------|---------------------|
| `jobs` | `customer_id = customer.id` |
| `job_services` | `job_id = job.id` |
| `change_orders` | `job_id = job.id` |
| `change_order_attachments` | via `change_order_id` |
| `documents` | `job_id = job.id AND visible_to_customer = true` |
| `completion_certificates` | `job_id = job.id` |
| `job_color_selections` | `job_id = job.id` |

---

## Padrão de Geração Automática de Credenciais

| Campo | Formato | Exemplo |
|-------|---------|---------
| **Username** | `FirstName_LastName` | `Wyllams_Bione` |
| **Password** | `FirstNameX*Year` | `WyllamsB*2026` |
| **Portal Email** | `username@customer.sidingdepot.app` | `wyllams_bione@customer.sidingdepot.app` |

> Usernames duplicados recebem sufixo automático: `Nick_Smith`, `Nick_Smith_2`, `Nick_Smith_3`, etc.

---

## Onde o Portal é Criado Automaticamente

| Origem | Arquivo | Como funciona |
|--------|---------|---------------|
| **Webhook ClickOne** | `app/api/webhook/clickone/route.ts` | Cria auth user + profile inline no handler |
| **New Project (admin)** | `app/(shell)/new-project/page.tsx` | Chama `POST /api/customers/create-portal` |

### API Route: `/api/customers/create-portal`

**Arquivo:** `app/api/customers/create-portal/route.ts`

Rota server-side que recebe `customerId` + `fullName` + `email` + `phone` e:

1. Verifica se customer já tem `profile_id` (evita duplicação)
2. Gera username único e password
3. Cria auth user via `auth.admin.createUser`
4. Cria profile com `role = customer`
5. Atualiza `customers` com `profile_id`, `username`, `portal_email`
6. Envia email de boas-vindas com credenciais via Gmail SMTP

> Falha na criação do portal **não bloqueia** a criação do projeto (try/catch isolado).

---

## Envio de Email de Boas-Vindas

| Configuração | Valor |
|-------------|-------|
| **Método** | Gmail SMTP via `nodemailer` |
| **Variáveis** | `GMAIL_USER` + `GMAIL_APP_PASSWORD` |
| **From** | `"Siding Depot" <GMAIL_USER>` |
| **Mensagem** | *"Your project with Siding Depot has been successfully closed."* |
| **Conteúdo** | Username, Password, botão "Access Your Portal →" |

> [!IMPORTANT]
> **Mudança em 2026-04-19:** Migrado de Resend API para Gmail SMTP (nodemailer).
> O Resend exigia domínio verificado para enviar para emails externos. O Gmail SMTP funciona imediatamente com App Password.

---

## Relacionados
- [[Customer Portal]]
- [[Autenticação e Controle de Acesso]]
- [[Webhook ClickOne]]
- [[Banco de Dados]]
- [[New Project]]
