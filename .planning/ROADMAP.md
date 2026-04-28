# Roadmap — v1.0 Stabilization

## Milestone 1: Estabilização v1 (14 Itens)

> Objetivo: Resolver todos os 14 itens de manutenção na ordem exata solicitada,
> entregando um v1 100% funcional sem erros.

### Phase 1: Change Orders — Portal do Cliente como Lista
- **Requirements:** REQ-001
- **Scope:** Refatorar UI do `customer/change-orders/page.tsx` para exibir cada CO como card separado com valor individual
- **Files:** `web/app/customer/change-orders/page.tsx`
- **Status:** Not Started
- **UAT:** Abrir portal do cliente → Change Orders → confirmar lista separada com valores individuais

### Phase 2: Change Orders — Mobile Responsivo
- **Requirements:** REQ-002
- **Scope:** Garantir layout empilhado vertical no mobile, touch-friendly, grid-cols-2 em attachments
- **Files:** `web/app/customer/change-orders/page.tsx`
- **Depends on:** Phase 1
- **Status:** Not Started
- **UAT:** Redimensionar janela para mobile → verificar empilhamento correto

### Phase 3: COC — Metadados do Projeto
- **Requirements:** REQ-003
- **Scope:** Expandir query do FieldCOCModal para trazer endereço, vendedor e data de contrato
- **Files:** `web/components/field/FieldCOCModal.tsx`
- **Status:** Not Started
- **UAT:** Abrir COC de um projeto → confirmar que endereço, vendedor e data aparecem

### Phase 4: Labor Bills — Filtro de Crews por Disciplina
- **Requirements:** REQ-004
- **Scope:** Filtrar dropdown de crews pela disciplina do template selecionado
- **Files:** `web/app/(shell)/labor-bills/page.tsx`
- **Status:** Not Started
- **UAT:** Selecionar template "Siding" → dropdown mostra apenas crews de siding

### Phase 5: Color Selection — Same / Different / Both
- **Requirements:** REQ-005
- **Scope:** Adicionar preferência de cor (3 opções) no portal do cliente
- **Files:** `web/app/customer/colors/page.tsx`
- **Status:** Not Started
- **UAT:** Abrir Colors no portal do cliente → ver 3 opções de preferência → salvar e persistir

### Phase 6: Labor Bills no Projeto (Documents tab)
- **Requirements:** REQ-006
- **Scope:** Adicionar card Labor Bills na tab Documents do projeto, substituir Site Photos
- **Files:** `web/app/(shell)/projects/[id]/page.tsx`
- **Status:** Not Started
- **UAT:** Abrir projeto → tab Documents → ver card Labor Bills com lista e navegação

### Phase 7: Cancelamento → Status Pending
- **Requirements:** REQ-007
- **Scope:** Auto-set status=pending quando último serviço é removido do calendário
- **Files:** `web/app/(shell)/schedule/page.tsx`
- **Status:** Not Started
- **UAT:** Remover último serviço do calendário → confirmar que status do job vai para "Pending"

### Phase 8: Calendar Drag & Drop — Qualquer Data
- **Requirements:** REQ-008
- **Scope:** Corrigir/validar drag & drop para permitir drop em qualquer dia (exceto domingo)
- **Files:** `web/app/(shell)/schedule/page.tsx`
- **Status:** Not Started
- **UAT:** Arrastar card para dia ocupado → confirmar que aceita o drop. Testar edge navigation entre semanas.

### Phase 9: Sorting — Projects por Sold Date
- **Requirements:** REQ-009
- **Scope:** Trocar `.order("created_at")` → `.order("contract_signed_at", { ascending: false, nullsFirst: false })`
- **Files:** `web/app/(shell)/projects/page.tsx`
- **Status:** Not Started
- **UAT:** Abrir Projects → confirmar ordem: mais recente no topo, sem data por último

### Phase 10: Sorting — Sales Performance (oldest first)
- **Requirements:** REQ-010
- **Scope:** Inverter ordem dos jobs no accordion de vendedores para ascending
- **Files:** `web/app/(shell)/sales-reports/page.tsx`
- **Status:** Not Started
- **UAT:** Abrir Sales Dashboard → expandir vendedor → confirmar ordem oldest-first

### Phase 11: Sorting — Cash Payments (latest first)
- **Requirements:** REQ-011
- **Scope:** Ajustar `.order()` na query de Cash Payments para descending
- **Files:** `web/app/(shell)/cash-payments/page.tsx`
- **Status:** Not Started
- **UAT:** Abrir Cash Payments → confirmar ordem: mais recente no topo

### Phase 12: Windows Popup — Campo de Preço
- **Requirements:** REQ-012
- **Scope:** Verificar/ajustar label do campo de preço no popup de Windows
- **Files:** `web/app/(shell)/new-project/page.tsx`
- **Status:** Not Started
- **UAT:** Criar projeto → selecionar Windows → confirmar campo "What is the price?" em layout 50/50

### Phase 13: Decks Popup — Campo de Preço
- **Requirements:** REQ-013
- **Scope:** Adicionar campo de preço currency acima do Scope dropdown
- **Files:** `web/app/(shell)/new-project/page.tsx`
- **Status:** Not Started
- **UAT:** Criar projeto → selecionar Decks → confirmar campo de preço acima do Scope

### Phase 14: Service Card — Windows/Doors/Decks Consolidado
- **Requirements:** REQ-014
- **Scope:** Verificar card combinado DWD com partner SERGIO e tracking de quantidade
- **Files:** `web/app/(shell)/new-project/page.tsx`, `web/app/(shell)/projects/[id]/page.tsx`
- **Status:** Not Started
- **UAT:** Verificar card consolidado "Doors/Windows/Decks" com badges de contagem
