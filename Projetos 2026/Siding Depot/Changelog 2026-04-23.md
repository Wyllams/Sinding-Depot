# Atualizações: Sincronização de Status dos Jobs (Agendamento e Projetos)

**Data da Atualização:** 23 de Abril de 2026
**Módulos Afetados:** 
- `app/(shell)/projects/page.tsx`
- `app/(shell)/projects/[id]/page.tsx`
- `app/(shell)/schedule/page.tsx`
- `app/(shell)/change-orders/page.tsx`
- `app/(shell)/crews/page.tsx`
- `app/(shell)/sales-reports/page.tsx`
- Banco de Dados (Supabase) - Tipo Enum `job_status`

**Objetivo:** Padronizar e unificar os status de trabalho em toda a plataforma. Anteriormente, havia duas nomenclaturas diferentes. O calendário usava opções visuais ("Pending", "Tentative", "Confirmed", "In Progress", "Done"), enquanto o banco de dados e os filtros salvavam apenas "active", "draft" ou "on_hold".

---

## 1. O Problema Original

Os módulos de "Schedule" e "Projects" utilizavam definições independentes de status. O Schedule salvava chaves como `active` (para Confirmed), `draft` (para Tentative) e `on_hold` (para Pending) na tabela `jobs`. Além disso, os status de "In Progress" e "Done" eram mapeados dinamicamente baseando-se apenas nas datas.

Essa abordagem resultava em:
1. Nomes conflitantes na interface.
2. Impossibilidade de forçar manualmente no banco de dados que um projeto estava "Done" ou "In Progress", já que o tipo ENUM da coluna `status` não permitia esses valores.
3. Buscas defeituosas na listagem de projetos quando o usuário selecionava filtros.

---

## 2. Como foi Resolvido

### Atualização do Banco de Dados (Supabase)
A coluna `status` da tabela `jobs` no PostgreSQL do Supabase usa um tipo customizado ENUM (`job_status`).
Para aceitar as novas 5 opções do calendário de forma literal, o banco foi alterado através da seguinte query executada via MCP (Model Context Protocol):

```sql
ALTER TYPE job_status ADD VALUE 'pending';
ALTER TYPE job_status ADD VALUE 'tentative';
ALTER TYPE job_status ADD VALUE 'scheduled';
ALTER TYPE job_status ADD VALUE 'in_progress';
ALTER TYPE job_status ADD VALUE 'done';

-- Atualização dos registros existentes
UPDATE jobs SET status = 'scheduled' WHERE status = 'active';
UPDATE jobs SET status = 'tentative' WHERE status = 'draft';
UPDATE jobs SET status = 'pending' WHERE status = 'on_hold';
```

### Unificação do Mapeamento (STATUS_MAP)
Em `projects/[id]/page.tsx` e `projects/page.tsx`, o mapeamento de cores e nomes (`STATUS_MAP`) foi atualizado para referenciar diretamente as novas 5 chaves.

- **`pending`**: 🔴 Pending
- **`tentative`**: 🟠 Tentative
- **`scheduled`**: 🔵 Confirmed
- **`in_progress`**: 🟢 In Progress
- **`done`**: 🟢 Done

**Importante:** Foi corrigido um bug crítico de *Runtime TypeError* onde o sistema tentava usar `STATUS_MAP.draft` como *fallback* se o status não fosse encontrado. Esse fallback foi atualizado para `STATUS_MAP.tentative`.

### Alterações nos Filtros Globais
Diversos módulos possuíam *hardcode* buscando pelos status antigos nas consultas do Supabase (`.in("status", ["active", "draft", "on_hold"])`).
Todos foram substituídos por `.in("status", ["pending", "tentative", "scheduled", "in_progress", "done"])`. Isso resolveu problemas de "No results found" no dropdown de Change Orders e nas listas de Crews/Sales Reports.

### Sincronização no Calendário (Schedule)
1. **Confirmação e Edição:** O Modal do Calendário (`confirmReschedule` e `Dropdown` de edição) agora exibe todas as 5 opções e grava esses textos brutos direto na tabela `jobs`.
2. **Auto-Agendamento:** A lógica onde o sistema tornava projetos pendentes ou rascunhos em ativos se a data inicial fosse alcançada, foi atualizada de `draft` para `tentative` → `scheduled`.

---

## 🛠 Consulta Rápida: Onde mexer se der problema

- **Cor ou Estilo de Status do Projeto:** Acesse a constante `STATUS_MAP` no topo de `app/(shell)/projects/[id]/page.tsx` e `app/(shell)/projects/page.tsx`.
- **Valores inválidos do ENUM:** Se aparecer o erro `[ProjectsPage] fetch error: {}` ou semelhante no Console Log, significa que você está passando no filtro ou no salvamento um status que não foi adicionado ao comando `ALTER TYPE job_status ADD VALUE` lá no Supabase.
- **Filtros e Buscas (`No results found`):** Procure sempre por consultas contendo `.in("status", [...])`. Certifique-se de que estão utilizando os novos valores literais.
