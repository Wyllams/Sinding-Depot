# 🗄️ Arquitetura do Banco de Dados

Nossos dados vivem no ecossistema PostgreSQL estruturado dentro do **Supabase**. Todos os esquemas de validação passam através de rigorosas verificações tipadas.

## Estrutura das Tabelas Principais

- **`jobs` (A raiz de tudo):** Cada linha é um projeto fechado/vendido. Contém metadados do cliente, status do projeto (Gates), e flags de disciplinas (se tem Siding, Roofing, etc.).
- **`customers`:** Dados sensíveis, endereços, e-mails vinculados às regras de auth e portal do cliente.
- **`crews`:** Parceiros que prestam o serviço. Dados financeiros básicos de pagamentos por diária ou *piece work*.
- **`service_calls`:** Tabela associativa filha de `jobs`. Registra demandas de manutenção (garantias, danos).
- **`windows_tracking`:** Uma tabela separada focada nos fornecedores e status das janelas sob medida encomendadas. Linkada ao `jobs` por `job_id`.

## RLS - Row Level Security (A Segurança)

O Supabase não faz a validação de acesso em nível de servidor API node tradicional, o acesso é barrado direto na porta do banco (Postgres). 
As "Policies" definem quem faz o quê:

*   **Padrão Administrativo:** `(auth.role() = 'authenticated') AND ('Admin' in (auth.user()->>'app_metadata'))` — Permite UPDATE, DELETE, INSERT livres.
*   **Padrão Customer:** A restrição permite `SELECT` em `jobs` *somente se* o `jobs.customer_id` for igual a `auth.uid()`.

## Cuidados na Migração e Foreign Keys

- Exclusões pesadas (como deletar um `job` no financeiro) são gerenciadas com ON DELETE CASCADE, mas protegidas por modais de dupla confirmação de alerta no frontend.

---
**Relações (Map):**
- As Roles de acesso configuradas pelo Firebase batem de frente aqui: [[Autenticação e Permissões (Roles)]]
- Os anexos linkados nessas tabelas: [[Storage e Anexos]]
