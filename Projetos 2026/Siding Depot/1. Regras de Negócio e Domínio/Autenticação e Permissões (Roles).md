# 🔐 Autenticação e Permissões (Roles)

O sistema conta com um ecossistema de autenticação dividido para abarcar a equipe interna (Staff) e clientes (Customers). Toda a camada é provida por conta do Supabase Auth e blindada pelo *Row Level Security (RLS)* no banco de dados.

## Padrão de Autenticação Dupla (Dual-Mode)

- **Staff (Admins, Sales, Crews):** 
  - Validam a sessão cruzando e-mail corporativo cadastrado (Magic Link) SOMADO a verificação do número de telefone (em breve por SMS/OTP).
  - O e-mail e o telefone precisam bater na tabela de cadastro de prepostos antes do login liberar acesso ao Dashboard Master.
  
- **Customers (Clientes Finais):**
  - Conta simples de e-mail e senha enviada pelo sistema via e-mail.
  - A automatização via [[Webhook e Integração ClickOne]] os cria silenciosamente (silent provision) quando assinam o contrato via integração.

## Matriz de Acesso (Roles)

| Role | Escopo de Acesso | Interface de Entrada |
| :--- | :--- | :--- |
| **Admin** | Irrestrito (Pode deletar, faturar, reagendar) | Dashboard Master `/` |
| **Sales** | Limitado (Não deleta ordens financeiras. Foco em Metas) | Dashboard Master (Restrito) |
| **Crew / Partner**| Fechado ao próprio escopo (Veem apenas projetos assinalados para eles no `schedule`) | [[Field App|Crews Companion App (Mobile PWA)]] |
| **Customer** | Fechado a uma ÚNICA casa/job (`customer_id=auth.uid()`) | [[Customer Portal]] (Login via e-mail) |

## O Gatilho no RLS (Row Level Security)

Se uma Crew logar, o Supabase intercepta o JWT daquele usuário, extrai a role na função `auth.jwt() -> 'app_metadata'`, e as tabelas `jobs` rejeitam qualquer `SELECT` que não tenha o `crew_id` do indivíduo. 

---
**Relações (Map):**
- Ver como isso se traduz no banco real: [[Arquitetura do Banco de Dados]]
- Automação da conta do cliente via webhook: [[Webhook e Integração ClickOne]]
- As permissões e níveis são configurados e geridos através do [[Settings]]
