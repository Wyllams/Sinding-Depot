---
tags:
  - projects
  - siding-depot
  - core
  - inline-edit
created: 2026-04-17
---

# 📋 Projects — Gestão de Projetos

> Voltar para [[🏗️ Siding Depot — Home]]

---

## 5.1 Listagem de Projetos

**Rota:** `/projects`

| Funcionalidade | Detalhes |
|----------------|----------|
| **Listagem completa** | Todos os jobs do Supabase com KPIs por projeto |
| **Filtros** | Por Status, Gating Status, busca textual |
| **Status Pipeline** | `draft` → `pending_scheduling` → `active` → `in_progress` → `completed` |
| **Gating Status** | Sistema visual de bloqueios operacionais |
| **Actions** | Click para abrir detalhes do projeto |

### Gating Status (Bloqueios Operacionais)

| Gate | Cor | Significado |
|------|-----|-------------|
| `NOT_CONTACTED` | 🔴 | Administrador não contatou o cliente |
| `READY` | 🟢 | Projeto liberado para execução |
| `WINDOWS` | 🔵 | Aguardando entrega de janelas → [[Windows e Doors Tracker]] |
| `DOORS` | 🟠 | Aguardando entrega de portas |
| `FINANCING` | 🟡 | Aguardando aprovação de financiamento |
| `MATERIALS` | 🔵 | Falta de material |
| `HOA` | 🔵 | Aprovação do HOA pendente |
| `OTHER_REPAIRS` | 🟣 | Reparos estruturais prévios necessários |
| `NO_ANSWER` | 🟠 | Tentativa de contato sem resposta |
| `PERMIT` | ⚪ | Aguardando licença/permissão |

---

## 5.2 Detalhes do Projeto

**Rota:** `/projects/[id]`

### Tabs

| Tab | Conteúdo |
|-----|----------|
| **Overview** | Dados do cliente, serviços, crews, blockers, COs |
| **Crews** | Crews atribuídos com disciplina e datas |
| **Documents** | Signing Documents + Project Vault (fotos, vídeos, docs) |

### Tab Overview

#### Coluna Esquerda — Overview
- **Header Hero** com nome do cliente como H1 gigante
- **KPI Strip** (4 cards): Start Date, End Date, Open Blockers, Pending COs
- **Client Card**: Avatar, nome, email, telefone — todos **editáveis inline**
- **Salesperson**: Dropdown dinâmico com auto-save
- **Location**: City e State editáveis inline
- **Services Grid**: Serviços vinculados ao job com [[Crews e Partners]] atribuídos
- **Internal Notes**: Textarea editável com auto-save

#### Coluna Direita
- **Blockers**: Listagem de blockers abertos/resolvidos
- **Change Orders**: Listagem de COs aprovados/pendentes → [[Change Orders]]

### Tab Documents (Signing Documents)

Seção **Signing Documents** com ícone roxo mostrando todos os milestones do projeto:

| Status | Badge | Ação disponível |
|--------|-------|-----------------|
| `draft` | Cinza | Botão **"Send to Client"** → muda para `pending_signature` |
| `pending_signature` | Amarelo "Awaiting Signature" | Botão **"Copy Link"** |
| `signed` | Verde "Signed" + data | Botão **"Copy Link"** |
| `paid` | Roxo "Paid" | — |

**Milestones são carregados automaticamente** quando o admin clica na tab Documents (`useEffect` com `fetchMilestones`).

Abaixo dos signing documents, há o **Project Vault**:
- **Contracts & Docs** — Upload de PDFs, contratos, permits
- **Site Photos** — Fotos before/during/after
- **Video Reports** — Walkthroughs e inspeções

→ Detalhes completos em [[Documentos e Contratos Digitais]]

---

## Capabilities do Detalhe

| Feature | Como funciona |
|---------|---------------|
| **Inline Edit (Auto-Save)** | Todos os campos são `<input>` transparentes. Ao perder foco (`onBlur`), a mudança é salva silenciosamente via Supabase |
| **Add Service** | Modal para adicionar novo serviço ao job, com seleção de tipo e inclusão automática de pintura se for Siding |
| **Assign Crew** | Modal para atribuir crews a cada serviço, com validação de especialidade |
| **Multi-Crew Support** | Card "Assign Another Crew" permite múltiplos crews ao mesmo serviço |
| **Gate Status** | Dropdown visual para mudar o status de bloqueio |
| **Status Badge** | Badge colorido dinâmico com o status atual do pipeline |
| **Send to Client** | Botão na tab Documents para enviar milestone ao [[Customer Portal]] |
| **Copy Link** | Copia URL de assinatura para enviar via WhatsApp/SMS ao cliente |

### Padrão Auto-Save

```typescript
// Pattern: handleAutoSave(table, id, field, value)
// Trigger: onBlur event em cada input
// Feedback: Silencioso (sem toast, sem spinner)
```

---

## Relacionados
- [[New Project]]
- [[Crews e Partners]]
- [[Change Orders]]
- [[Job Schedule]]
- [[Banco de Dados]]
- [[Documentos e Contratos Digitais]]
- [[Customer Portal]]
