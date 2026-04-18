# 📍 Módulo - Projetos e Tracking

O painel mestre de operações, onde a visão "Macro" e "Micro" dos projetos se encontram. É aqui que definimos os Gates e ditamos o andamento da empresa inteira.

## A Dinâmica de Tracking (Gating System)

O Tracking via Gating é uma série de estágios onde a "batata quente", a responsabilidade daquele projeto, pula de departamento em departamento. Isso evita que o Financeiro se preocupe com obras que ainda estão no papel, ou que a Equipe de Campo puxe uma obra que não foi cobrada no upfront e liberada pelos gerentes.

- **Status / Gates Principais:**
  - *Gate 1 - Sales & Permitting* (Assinado, papelada correndo, licenças com a cidade).
  - *Gate 2 - Measurement / Materials* (Apenas medição das metragens de janelas; compra).
  - *Gate 3 - Ready to Schedule* (Tudo na mão. Aguardando a Crew ter data viva).
  - *Gate 4 - Active Installation* (No local. Crew com botina suja de barro).
  - *Gate 5 - Cash / Financial* (Acabou. Agora falta cobrar os pagamentos finais da família ou banco).
  - *Gate 6 - Completed* (Obra enterrada nas glórias passadas).

## Rotas Associadas
- `/projects` -> Visão de grade gerencial com tabela dinâmica. Todo Job tem sua tag colorida respectiva à disciplina principal.
- `/projects/[id]` -> Tela "Detail", separando os painéis esquerdo (Metadados do cliente e Gating Status) e do painel direito (Calendário, Pagamentos e Relatórios de Serviço).

## Regras de Interface Críticas
- Toda mudança de "Gate" força uma persistência assíncrona chamando o hook ou server action `handleGateChange()`, gravando instantaneamente no Supabase.
- A exclusão de um projeto só pode ser feita por níveis de *Admin* reais e necessita um double-check modal (ver em: [[Módulo - Cash Payments (Financeiro)]]).

---
**Relações (Map):**
- Quando muda o Gate pra "Scheduling", essa inteligência de quem faz obedece a: [[Regras de Agendamento (Scheduling)]]
- Interface herdeira do Padrão Core da Startup: [[Design System e Padrões]]
- A criação dessas instâncias de acompanhamento começam em: [[New Project]]
