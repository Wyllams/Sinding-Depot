# 🏗️ Melhorias & Correções — Siding Depot
#backlog #product #siding-depot

> **Criado em:** 2026-04-15  
> **Responsável:** Wyllams  
> **Status geral:** 🟡 Em análise

---

## 📊 Visão Geral de Prioridades

| # | Módulo | Descrição Curta | Prioridade | Status |
|---|--------|-----------------|------------|--------|
| 1 | Schedule | Status do card muda para "In Progress" ao confirmar | 🔴 Alta | ✅ DONE |
| 2 | Schedule | Troca de parceiro mesmo após confirmação | 🔴 Alta | ✅ DONE |
| 3 | Schedule | Novos jobs aparecem nos calendários corretos | 🔴 Alta | ✅ DONE |
| 4 | Projects | Paginação (20 por página) | 🟡 Média | ✅ DONE |
| 5 | Projects | Corrigir opções do dropdown de status | 🔴 Alta | ✅ DONE |
| 6 | Crews | Botão de inativar parceiro + campo de justificativa | 🟡 Média | ✅ DONE |
| 7 | Change Orders | Uploads de arquivos funcionando + visualização no card | 🔴 Alta | ✅ DONE |
| 8 | Services | Input de Crew/Parceiro + uploads funcionando | 🔴 Alta | ✅ DONE |
| 9 | Services | Posicionamento do filtro de Status | 🟢 Baixa | ✅ DONE |
| 10 | Reports | "Set Goals" focado na meta da empresa (não por vendedor) | 🟡 Média | ✅ DONE |
| 11 | Settings/Roles | Tela "Create Role" 100% funcional | 🟡 Média | ✅ DONE |
| 12 | Settings | Perfil do usuário (foto, nome, telefone, e-mail) | 🟡 Média | ✅ DONE |

---

## 🗓️ Schedule (Calendário)

### ✅ #1 — Status do card muda ao confirmar
**Contexto:** Quando o Nick clicar em **"Confirm"** em um agendamento, o indicador visual do card deve mudar automaticamente de **Scheduled** para **In Progress**.

**Comportamento esperado:**
- Aplica-se ao calendário **Operacional** (Nick) e ao calendário de **Vendedores**
- A bolinha colorida no card deve refletir o novo status em tempo real
- O status no banco (`service_assignments.status`) deve ser atualizado para `in_progress`

**Arquivos impactados:**
- `app/(shell)/schedule/page.tsx` — lógica de confirmação e mapeamento de status visual

---

### ✅ #2 — Troca de parceiro após confirmação
**Contexto:** Mesmo após um serviço já confirmado, o Nick deve conseguir **reatribuir o parceiro/crew** diretamente pelo card no calendário.

**Comportamento esperado:**
- Clicar em um card já confirmado abre o modal com opção de **trocar de parceiro**
- O dropdown de seleção de crew deve estar disponível mesmo no status `in_progress`
- A mudança deve atualizar o `crew_id` no registro de `service_assignments`

---

### ✅ #3 — Novos jobs aparecem nos calendários corretos
**Contexto:** Ao criar um novo job/project, ele deve aparecer automaticamente no calendário correto com base nos dados preenchidos.

**Regras de negócio:**
| Situação | Onde aparece |
|----------|-------------|
| `End Date` **NÃO** preenchida | Calendário dos **Vendedores** (Pending Scheduling) |
| `End Date` **preenchida** | Calendário **Operacional** |

**No calendário Operacional, o card deve mostrar:**
- Nome do **serviço** (ex: Siding, Roofing)
- Nome do **parceiro/crew** atribuído
- **Data** correta do agendamento

---

## 📁 Projects

### ✅ #4 — Paginação na listagem de projects
**Contexto:** A tela de Projects deve carregar no máximo **20 projetos por página**, com navegação entre páginas.

**Comportamento esperado:**
- Página 1: projetos 1–20 | Página 2: projetos 21–40 | etc.
- Incluir controles de navegação: `← Anterior` / `Próxima →` + indicação `Página X de Y`
- A paginação deve preservar filtros e ordenação ativos

---

### ✅ #5 — Corrigir opções do dropdown de Status
**Contexto:** O dropdown de status na tela de Projects tem apenas 3 opções incorretas.

**Situação atual (errada):**
- Tentative / Pending / Confirmed

**Correção necessária — opções corretas:**
- `Draft` — Rascunho inicial
- `Pending Scheduling` — Aguardando agendamento
- `Active` — Em andamento
- `On Hold` — Pausado
- `Completed` — Concluído
- `Cancelled` — Cancelado

> ⚠️ Verificar os valores exatos no banco (`jobs.status`) antes de implementar

---

## 👷 Crews & Partners

### ✅ #6 — Inativar parceiro com justificativa
**Contexto:** Na tela **Crews & Partners Directory**, deve ser possível inativar um parceiro com um motivo registrado.

**Comportamento esperado:**
- Novo botão **"Inativar Parceiro"** dentro do popup **"View Details"**
- Ao clicar, exibir um campo de texto longo (textarea) para o usuário descrever o motivo da inativação
- O parceiro inativado deve:
  - Sair da listagem principal de crews ativos
  - Ter o registro preservado no banco (`active = false`) com o campo `inactivation_reason` preenchido
- Campo a adicionar no banco: `crews.inactivation_reason` (text, nullable)

---

## 📋 Change Orders

### ✅ #7 — Upload e visualização de arquivos
**Contexto:** No popup **"Create New Change Order"**, o input de upload (imagens, documentos, vídeos) não está funcionando.

**Correção:**
- Corrigir o input de upload para aceitar: `.jpg`, `.png`, `.pdf`, `.mp4`, `.docx`, etc.
- Os arquivos devem ser armazenados no **Supabase Storage** (bucket `change-orders` ou similar)

**Visualização:**
- Ao clicar em um **card de Change Order**, o popup deve exibir todos os arquivos anexados
- Imagens → preview inline
- Vídeos → player embutido ou link de download
- Documentos → ícone com link de download

---

## 🛠️ Services (Chamados de Serviço)

### ✅ #8 — Input de Crew/Parceiro + uploads
**Contexto:** No popup **"+ New Service Call"**, dois problemas precisam ser corrigidos.

**Problema 1 — Input "Assigned Team / Profile":**
- Atualmente não carrega nenhum parceiro
- Deve buscar e exibir **todos os parceiros/crews ativos** do banco
- Fonte: tabela `crews` onde `active = true`

**Problema 2 — Upload de arquivos:**
- Input de upload não está funcionando
- Deve aceitar: imagens, vídeos, documentos
- Arquivos devem ser armazenados no **Supabase Storage**
- Ao clicar em um card de service call, o popup deve exibir os arquivos com preview (igual ao item #7)

---

### ✅ #9 — Posicionamento do filtro de Status
**Contexto:** Na tela de Services, o filtro de **Status** (All / Open / Resolved) está mal posicionado, colado ao filtro de **Discipline / Type**.

**Correção:**
- Mover o filtro de **Status** para o canto **esquerdo** da barra de filtros
- O filtro de **Discipline / Type** permanece à direita

---

## 📊 Reports (Sales Dashboard)

### ✅ #10 — "Set Goals" focado na meta da empresa
**Contexto:** Atualmente, o botão **"Set Goals"** abre um modal para definir metas por vendedor. Isso deve mudar.

**Novo comportamento:**
- O botão **"Set Goals"** define apenas **metas da empresa** (não individuais por vendedor)
- Dois campos:
  - 🎯 **Meta Semanal** — valor em dólares ($)
  - 🎯 **Meta Mensal** — valor em dólares ($)
- As metas devem ser exibidas no dashboard como barra de progresso ou indicador percentual

---

## ⚙️ Settings

### ✅ #11 — Create Role 100% funcional
**Contexto:** A tela `Settings → Roles → New` (Create Role) precisa estar totalmente funcional.

**Módulos com controle de permissão (Ver / Editar / Ocultar):**
- Dashboard
- Projects
- Crews
- Change Orders
- Cash Payments
- Windows Tracker
- Services
- Schedule
- Reports

**Comportamento esperado:**
- Para cada módulo, o admin pode definir:
  - 👁️ **Ver** — usuário vê o módulo mas não edita
  - ✏️ **Editar** — usuário vê e edita
  - 🚫 **Ocultar** — módulo não aparece no menu do usuário
- As permissões devem ser salvas no banco e aplicadas dinamicamente no layout

---

### ✅ #12 — Perfil do usuário (foto, nome, contato)
**Contexto:** Na tela de **Settings**, o usuário deve poder configurar seu perfil completo.

**Campos necessários:**
| Campo | Onde aparece no sistema |
|-------|------------------------|
| 📸 Foto/Avatar | Aviso de topo (TopBar) + qualquer avatar do usuário |
| 👤 Nome completo | TopBar + cards de atribuição |
| 📞 Telefone | Perfil interno |
| 📧 E-mail | Perfil interno |

**Comportamento esperado:**
- Avatar deve aparecer em **todo o sistema** que referencie o usuário logado
- Nome deve substituir qualquer valor hardcoded como "Jonny" ou "Project Director"
- Foto deve ser armazenada no **Supabase Storage** (bucket `avatars`)

---

## 📌 Notas Técnicas Gerais

```
Database: Supabase (PostgreSQL)
Storage: Supabase Storage (para uploads)
Frontend: Next.js 16 + React 19 (App Router)
Auth: Supabase Auth
Stack CSS: Tailwind CSS
```

> 💡 **Dica de implementação:** As melhorias #7 e #8 (uploads) devem ser implementadas juntas, pois compartilham a mesma lógica de Storage. Criar um hook `useFileUpload()` reutilizável.

> ⚠️ **Atenção:** A melhoria #11 (Roles) depende de um sistema de middleware no Next.js para ocultar rotas dinamicamente com base nas permissões do usuário logado.

---

*Documento gerado em 2026-04-15 | Siding Depot v1.0*
