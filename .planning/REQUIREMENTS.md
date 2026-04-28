# Requirements — v1.0 Stabilization

## Milestone: Estabilização v1 (14 Itens de Manutenção)

### REQ-001: Change Orders — Portal do Cliente como Lista
**Prioridade:** ⚠️⚠️ Crítica
**Módulo:** Portal do Cliente
**Descrição:** Os Change Orders no portal do cliente devem exibir como lista separada (igual ao Admin), com cada CO tendo seu próprio card com valor total individual. Cada card mostra: título, status badge, quem solicitou, data, itens numerados com descrição e valor, attachments, e total específico do CO. Botões Approve/Reject individuais por CO.

### REQ-002: Change Orders — Mobile Responsivo
**Prioridade:** ⚠️⚠️ Crítica
**Módulo:** Portal do Cliente (mobile)
**Descrição:** Na versão mobile, os Change Orders devem aparecer empilhados verticalmente como lista. Layout responsivo: desktop = cards em grid, mobile = lista vertical empilhada. Attachments em grid-cols-2 no mobile. Botões touch-friendly (min 48px).

### REQ-003: COC — Metadados do Projeto
**Prioridade:** ⚠️⚠️ Crítica
**Módulo:** Certificate of Completion (Field Portal)
**Descrição:** O COC deve exibir: endereço correto do serviço, nome do vendedor que fechou o projeto, e data de assinatura do contrato. Dados vêm de `jobs.service_address_line_1`, `jobs.salesperson_id → salespersons.full_name`, `jobs.contract_signed_at`.

### REQ-004: Labor Bills — Filtro de Crews por Disciplina
**Prioridade:** ⚠️⚠️ Crítica
**Módulo:** Admin — Labor Bills
**Descrição:** O dropdown de Crews no Labor Bills deve filtrar por disciplina quando um template é selecionado. Ex: template "Siding" mostra apenas crews de Siding (via `crew_specialties → specialties.code`). Mapping: siding→siding_installation, painting→painting, gutters→gutters, roofing→roofing.

### REQ-005: Color Selection — Same / Different / Both
**Prioridade:** ⚠️ Alta
**Módulo:** Portal do Cliente — Colors
**Descrição:** Adicionar opção de preferência de cor com 3 choices: "Same Color", "Different Color", "Both". Renderizar como toggle/radio buttons antes da seleção de cores. Persistir em campo `color_preference` no banco.

### REQ-006: Labor Bills dentro do Projeto (Documents tab)
**Prioridade:** ⚠️ Alta
**Módulo:** Admin — Projeto Detalhes
**Descrição:** Adicionar card "Labor Bills" dentro da tab Documents do projeto, substituindo "Site Photos". Card mostra contagem de labor bills do projeto. Lista cada labor bill com data, crew, valor, status. Ao clicar navega para a página de Labor Bills filtrada.

### REQ-007: Cancelamento automático → Status Pending
**Prioridade:** ⚠️ Alta
**Módulo:** Admin — Schedule (Calendário)
**Descrição:** Quando todos os serviços de um cliente são removidos do calendário, o `Job Start Status` deve automaticamente voltar para "pending". Verificar após cada delete de `service_assignment` se restam assignments para o job_id. Se não restarem → `UPDATE jobs SET status = 'pending'`.

### REQ-008: Calendar Drag & Drop — Qualquer Data
**Prioridade:** ⚠️ Alta
**Módulo:** Admin — Schedule (Calendário)
**Descrição:** O drag & drop deve permitir mover cards para qualquer data, incluindo datas que já têm outros cards. A edge navigation (semanas anteriores/seguintes) já existe. Remover qualquer guard que impeça drop em slots ocupados. Manter bloqueio de domingos.

### REQ-009: Sorting — Projects por Sold Date (desc)
**Prioridade:** ⚠️ Alta
**Módulo:** Admin — Projects
**Descrição:** A tabela de Projects deve ordenar por `contract_signed_at` descending (mais recente primeiro). Projetos sem data de venda ficam por último (`nullsFirst: false`).

### REQ-010: Sorting — Sales Performance (oldest first)
**Prioridade:** ⚠️ Alta
**Módulo:** Admin — Sales Reports
**Descrição:** Na seção "Sales Performance" (accordion de jobs por vendedor), ordenar jobs do mais antigo para o mais recente (ascending).

### REQ-011: Sorting — Cash Payments (latest first)
**Prioridade:** ⚠️ Alta
**Módulo:** Admin — Cash Payments
**Descrição:** A tabela de Cash Payments deve mostrar pagamentos mais recentes primeiro (descending por `payment_date`).

### REQ-012: Windows Popup — Campo de Preço
**Prioridade:** ⚠️ Alta
**Módulo:** Admin — New Project Wizard
**Descrição:** No popup de Windows no wizard de criação de projeto, o campo de preço já existe em layout 50/50 (Quantity + Price). Verificar que o label está correto ("What is the price?") e que o valor é persistido em `job_services.contracted_amount`.

### REQ-013: Decks Popup — Campo de Preço acima do Scope
**Prioridade:** ⚠️ Alta
**Módulo:** Admin — New Project Wizard
**Descrição:** No popup de Decks, adicionar campo "What is the price?" (input currency com $) ACIMA do campo Scope. Adicionar state `decksPrice`. Persistir em `job_services.contracted_amount`. Validação: botão Confirm desabilitado se preço ou scope não preenchidos.

### REQ-014: Service Card — Windows/Doors/Decks consolidado
**Prioridade:** ⚠️ Alta
**Módulo:** Admin — New Project + Project Detail
**Descrição:** Windows, Doors e Decks devem ficar sob um único card "Doors/Windows/Decks" com partner SERGIO. Verificar que tracking de quantidade (ex: "4 Windows, 2 Doors, 1 Deck") está visível. Este item pode já estar implementado — confirmar.
