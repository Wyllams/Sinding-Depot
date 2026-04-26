---
tags:
  - changelog
  - siding-depot
  - field-app
  - customer-portal
  - change-orders
  - coc
  - dark-mode
  - service-reports
date: 2026-04-26
---

# 🚀 Changelog — 26 de Abril de 2026

Este documento registra todas as otimizações operacionais, correções de interface e novas funcionalidades implementadas hoje (26/04/2026) no sistema Siding Depot. Foco principal: **automação de workflows field-to-admin**, melhoria de UX no portal do cliente e ferramentas de reporting para crews.

---

## 1. Remoção do Card "Operational Status" (`projects/[id]/page.tsx`)

**O que foi feito:**
Removido o card de seção "Operational Status" da aba Overview dos detalhes do projeto (linhas 1885-1920 do arquivo original).

**Como foi feito:**
A seção `<section>` com `SectionHeader icon="traffic" title="Operational Status"` continha um dropdown `CustomDropdown` duplicado para seleção do Gate Status. Essa seção foi completamente removida, e o card de **Paint Colors** que dividia a grid com ele agora ocupa sua própria seção standalone.

**Por que foi feito:**
O dropdown de Gate Status **já existe inline no header do projeto** (linhas 1598-1614), tornando o card da seção redundante. Dois controles para a mesma informação geram confusão na equipe — o admin podia alterar em um e não perceber o outro. Agora há apenas um ponto de controle, mais limpo e direto.

**Arquivos modificados:**
- `web/app/(shell)/projects/[id]/page.tsx`

---

## 2. Dark/Light Mode no Portal do Cliente (`customer/layout.tsx`)

**O que foi feito:**
O Portal do Cliente agora responde corretamente ao toggle de tema Dark/Light. Todas as cores hardcoded foram substituídas por tokens CSS do Design System.

**Como foi feito:**
O componente `ThemeSwitcher` já estava importado e renderizado no header (desktop e mobile), mas o layout usava classes CSS fixas:

| Antes (Hardcoded) | Depois (Token CSS) |
|---|---|
| `bg-white` | `bg-surface-container` |
| `bg-on-surface` | `bg-background` |
| `border-[#e5e5e3]` | `border-outline-variant` |
| `text-[#a1a19d]` | `text-on-surface-variant` |
| `text-surface-container-low` | `text-on-surface` |
| `bg-[#f0fae1]` | `bg-primary/10` |
| `hover:bg-on-surface` | `hover:bg-surface-container-high` |

As variáveis CSS mudam automaticamente entre os modos (definidas em `globals.css` sob `:root` / `[data-theme="dark"]`).

**Por que foi feito:**
O `ThemeSwitcher` estava visível mas não funcionava porque os estilos estavam fixos em cores claras. O cliente via o botão de toggle mas nada mudava visualmente. Agora o tema funciona end-to-end.

**Arquivos modificados:**
- `web/app/customer/layout.tsx`

---

## 3. Notificação Padrão ao Atualizar Credenciais (`settings/page.tsx`)

**O que foi feito:**
O sistema agora dispara uma notificação push padrão quando qualquer usuário atualiza seu perfil (nome/telefone) na página de Settings.

**Como foi feito:**
Após o `supabase.from("profiles").update(...)` retornar com sucesso dentro de `handleSaveProfile()`, uma chamada `fetch('/api/push/notify')` é disparada com:
- `title`: "👤 Profile Updated"
- `body`: "{Nome} updated their profile information."
- `notificationType`: "profile_update"
- `relatedEntityId`: ID do perfil

A chamada é envolvida em `try/catch` para ser **non-blocking** — se a notificação falhar, o save do perfil não é afetado.

**Por que foi feito:**
O Nick pediu que o sistema notifique quando credenciais são atualizadas. Isso segue o mesmo padrão já usado em extra materials (`field/jobs/[id]/page.tsx`) e outras funcionalidades que usam o endpoint `/api/push/notify`.

**Arquivos modificados:**
- `web/app/(shell)/settings/page.tsx`

---

## 4. Correção da "Data Start" dos Crews/Parceiros

**O que foi feito:**
Verificação completa do código e dos dados no Supabase para validar se o campo `scheduled_start_at` está sendo exibido corretamente.

**Como foi feito:**
Auditoria em 3 camadas:
1. **Código `field/jobs/page.tsx`** — Já usa `service_assignments.scheduled_start_at` (linha 102)
2. **Código `field/jobs/[id]/page.tsx`** — Já busca `sa.scheduled_start_at` (linhas 163-169)
3. **Dados no Supabase** — Query direta confirmou que os `scheduled_start_at` são datas futuras de agendamento (ex: XICARA em 2026-06-22), **diferentes** do `contract_signed_at` (ex: 2026-04-02)

**Por que não foi necessário alterar código:**
O código já estava correto. O problema reportado pode ter sido causado por dados antigos que foram corrigidos em agendamentos posteriores. Nenhuma alteração de código foi necessária.

---

## 5. Restrição de Change Orders por Serviço (`FieldChangeOrderModal.tsx`)

**O que foi feito:**
Cada Crew/Parceiro agora só consegue criar Change Orders para os serviços em que está **designado** (`service_assignments`).

**Como foi feito:**
O `useEffect` do modal foi refatorado de:
```
// ANTES: buscava TODOS os serviços do job
supabase.from("job_services").select(...)
```
Para:
```
// DEPOIS: filtra apenas serviços onde o crew está atribuído
1. Busca crew_id via profiles.id → crews.profile_id
2. Busca service_assignments.job_service_id onde crew_id = meuCrew
3. Filtra jobServices para mostrar apenas os que estão no Set de IDs
```

**Fallback:** Se o usuário logado **não tem crew** (é admin), todos os serviços são exibidos normalmente.

**Por que foi feito:**
Antes, um parceiro de Roofing conseguia criar um Change Order para Siding, gerando confusão no workflow do admin. Agora cada crew só vê e interage com seus próprios serviços, garantindo integridade operacional.

**Arquivos modificados:**
- `web/components/field/FieldChangeOrderModal.tsx`

---

## 6. Auto-Criação de COC no Agendamento (Migration SQL)

**O que foi feito:**
Quando um serviço é agendado no calendário (drag-and-drop ou via API), um documento de **Certificate of Completion (COC)** é criado automaticamente na tabela `documents`.

**Como foi feito:**
Migration Supabase `auto_create_coc_on_schedule` com:

1. **Function PostgreSQL:** `auto_create_coc_on_schedule()` que:
   - Verifica se `scheduled_start_at` foi definido (não é NULL)
   - Busca `job_id` e `service_name` via `job_services` + `service_types`
   - Busca `customer_name` via `jobs` + `customers`
   - Verifica se já existe um COC para aquele `job_service_id`
   - Insere na tabela `documents` com `document_type = 'completion_certificate'`
   - Define `visible_to_partner = true` e `visible_to_customer = false`
   - Salva `crew_id`, `service_name` e `auto_generated` no campo `metadata` (JSONB)

2. **Trigger:** `trg_auto_coc_on_assignment` disparado em `AFTER INSERT OR UPDATE OF scheduled_start_at` na tabela `service_assignments`

**Por que foi feito:**
O Nick pediu que o COC já estivesse disponível para o parceiro e para o admin assim que o serviço fosse agendado, sem necessidade de criar manualmente. O trigger no banco garante que funciona independente de onde o agendamento é feito (schedule page, webhook, API direta).

**Tipo de enum utilizado:** `completion_certificate` (já existia no enum `document_type`)

---

## 7. Botões de Status + Report no Field Services (`field/services/page.tsx`)

**O que foi feito:**
Dois novos botões foram adicionados dentro de cada card expandido na página de Services do Field App:
1. **Change Status** — Avança o status do blocker: `open → in_progress → resolved`
2. **Report** — Abre um modal completo para enviar relatório com fotos e anotações

**Como foi feito:**

### 7.1 — Botão Change Status
- Mapeamento de fluxo via `STATUS_FLOW`:
  - `open` → botão "Start Work" (verde-lima)
  - `in_progress` → botão "Mark Resolved" (verde)
  - `resolved` → botão desabilitado "Resolved" (badge)
- Atualização inline via `supabase.from("blockers").update({ status: newStatus })`
- Estado otimístico no frontend com loading spinner por card

### 7.2 — Botão Report + Modal (`FieldServiceReportModal.tsx`)
Novo componente criado com:
- Campo de **notas** (textarea, max 2000 chars)
- Upload de **fotos** via câmera ou galeria (com `compressImage`)
- **Anotação individual por foto** (cada foto tem seu campo de texto)
- Upload para R2 via `/api/upload`
- Persistência em `service_reports` + `service_report_photos`
- **Notificação push** para admins via `/api/push/notify`
- Design mobile-first (bottom sheet com handle bar)

**Por que foi feito:**
Os crews precisavam de uma forma rápida e direta de:
1. Atualizar o status de uma service call sem voltar ao admin
2. Documentar o trabalho feito com fotos anotadas para que o admin tenha contexto visual

**Arquivos modificados:**
- `web/app/field/services/page.tsx` (reescrito com novos botões)
- `web/components/field/FieldServiceReportModal.tsx` (**novo**)

**Migrations aplicadas:**
- `enhance_service_reports` — Adicionou colunas `crew_id` e `job_service_id` à tabela existente `service_reports`
- `create_report_photos_and_rls` — Nova tabela `service_report_photos` com RLS policies

---

## 8. Normalização de Nomes na Tabela de Services (`field/services/page.tsx`)

**O que foi feito:**
Os nomes dos clientes na listagem de Services do Field App agora mostram o nome correto do cliente ao invés do título composto do job.

**Como foi feito:**
1. **Query:** Adicionado `customers ( full_name )` no join: `jobs ( job_number, title, customers ( full_name ) )`
2. **Interface:** Tipagem atualizada para incluir `customers?: { full_name: string } | null`
3. **Render:** Prioriza `customers.full_name`, com fallback para `title.split(" - ").pop()`

**Por que foi feito:**
Antes, os nomes apareciam como `"Siding, Painting, Decks - Julie Leonard"` (título completo do job). Agora aparece apenas `"Julie Leonard"`, limpo e profissional para o parceiro em campo.

**Arquivos modificados:**
- `web/app/field/services/page.tsx`

---

## Resumo Técnico

| Componente | Tipo de Mudança | Status |
|---|---|---|
| `projects/[id]/page.tsx` | Remoção de UI | ✅ Deploy |
| `customer/layout.tsx` | Refactor CSS | ✅ Deploy |
| `settings/page.tsx` | Nova notificação | ✅ Deploy |
| `FieldChangeOrderModal.tsx` | Lógica de negócio | ✅ Deploy |
| `field/services/page.tsx` | Novos botões + query | ✅ Deploy |
| `FieldServiceReportModal.tsx` | Componente novo | ✅ Deploy |
| PostgreSQL trigger (COC) | Migration | ✅ Aplicada |
| `service_report_photos` table | Migration + RLS | ✅ Aplicada |

**Ambiente e Deploy:**
- Build validado com `next build` — zero erros de compilação
- Commit atômico com 6 arquivos (565 inserções, 107 remoções)
- Push para `main` do GitHub (`df4c3d9`)
- 3 migrations aplicadas no Supabase (produção)
