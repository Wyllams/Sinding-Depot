# Atualizações: Lógica de Agendamento, Edição de Decks/Windows e Sincronização de Estado

**Data da Atualização:** 22 de Abril de 2026
**Módulos Afetados:** `projects/[id]/page.tsx`, `schedule/page.tsx`
**Objetivo:** Padronizar a criação e edição de agendamentos no calendário, corrigir inconsistências de cálculo de prazo e evitar quebras de renderização na atualização de estado (`Cannot read properties of undefined`).

---

## 1. Correção do Cálculo de Duração de "Decks"

### O Problema Original
O sistema criava os cards para o serviço "Decks" sem considerar o tempo variável baseado na complexidade do serviço (Scope). A criação era acionada antecipadamente no Passo 2 (Seleção de Serviços), aplicando um prazo padrão incorreto.

### Como foi Resolvido
1. **Adição do Campo `deckScope`:** Criamos um step dedicado (`deckscope`) na interface de sub-serviços quando "Decks" é selecionado.
2. **Nova Lógica de Prazos (`calcDuration`):** O cálculo de tempo (`days`) agora intercepta se o serviço é "decks" e aplica os prazos acordados na tabela:
    - `deck rebuild (demo)` -> **5 dias**
    - `deck rebuild (W/ porch)` -> **10 dias (2 semanas)**
    - `floor replacement` -> **4 dias**
    - `Railing` -> **1 dia**
3. **Delegação da Criação:** A função `handleAssignService` foi instruída a **pular** a inserção de "Decks" durante a etapa de seleção. O registro real no banco de dados (`service_assignments`) só acontece após o usuário escolher a resposta no dropdown do "Scope" e confirmar.

---

## 2. Implementação da Funcionalidade de Edição (Windows & Decks)

### O Problema Original
Após o projeto já estar agendado, não era possível alterar a contagem/trim das janelas (Windows) ou mudar a complexidade do deck (Scope) sem ter que excluir e recriar o serviço, dificultando o retrabalho e o recálculo do calendário.

### Como foi Resolvido
1. Foi criado um **Menu de Edição (`edit_menu`)** que aparece ao clicar em um serviço (`Windows` ou `Decks`) que já tem um parceiro atribuído.
2. Foram criadas duas novas telas de edição:
   - **`edit_windows`:** Permite reajustar `windowsCount` e `windowsTrim`.
   - **`edit_deckscope`:** Permite reajustar a resposta do dropdown de `deckScope`.
3. **Atualização Automática de Datas:**
   - Ao clicar em "Save Changes" dentro da aba de edição, o sistema recalcula a duração com a mesma função `calcDuration`.
   - Em seguida, pega a `scheduled_start_at` existente, soma a nova quantidade de dias úteis, obtém a nova `scheduled_end_at` e **salva diretamente na tabela `service_assignments`**.

---

## 3. Correção do Erro de Renderização (`reading 'filter'`)

### O Problema Original
Ao salvar a edição de um serviço, a tela quebrava com o erro: `Fast Refresh had to perform a full reload due to a runtime error. Cannot read properties of undefined (reading 'filter')`.

### A Causa Raiz
O manipulador de salvamento das edições fazia um *re-fetch* dos dados usando uma Query Supabase simplificada:
```typescript
// Antiga abordagem que quebrava:
const { data: fresh } = await supabase.from("jobs").select("*, ...").single();
if (fresh) setJob(fresh);
```
Como a query não puxava `blockers` e `change_orders`, ao injetar esse objeto cru no estado `setJob`, o React encontrava `undefined` quando tentava renderizar `job.blockers.filter(...)`.

### Como foi Resolvido
Removemos as requisições *inline* falhas e as substituímos pela função central já existente:
```typescript
// Nova abordagem:
await fetchJob();
```
A função `fetchJob()` é a "fonte da verdade" pois busca todos os relacionamentos de forma correta (incluindo RLS bypass para `change_orders`) e retorna um objeto tipado e normalizado `JobDetail`. Isso evitou a quebra de renderização.

---

## 4. Padronização Visual das Cores

Para garantir que o calendário e a lista de serviços do projeto tenham a mesma identidade visual:
- Serviços **Doors, Windows, Decks (DWD)** foram forçados para a cor Laranja (`#f5a623`).
- Serviço **Painting** foi padronizado para Azul (`#4a90e2`).
- A lógica foi injetada no dicionário global de cores para prevalecer sobre a cor padrão do banco de dados, caso estivesse errada.

---

## 🛠 Consulta Rápida: Onde mexer se der problema

- **Cálculos de prazos / dias úteis:** Procurar pela função `calcDuration(code: string, sq?: number)` no arquivo `projects/[id]/page.tsx`.
- **Validação de Banco de Dados:** O Parceiro (Crew) só é atribuído a um serviço se tiver a *Specialty* cadastrada na tabela `crew_specialties`. Se um serviço não for criado silenciosamente, verifique se o parceiro possui permissão.
- **Renderização e Re-fetch:** Qualquer edição no `job` via Modal *deve* invocar `await fetchJob()` após salvar no banco, NUNCA criar objetos `setJob` parciais manualmente para evitar quebra de interface.
