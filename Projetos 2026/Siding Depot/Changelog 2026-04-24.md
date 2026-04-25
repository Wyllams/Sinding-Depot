---
tags:
  - changelog
  - siding-depot
  - webhook
  - realtime
  - services
  - change-orders
date: 2026-04-24
---

# 🚀 Changelog — 24 de Abril de 2026

Este documento registra todas as otimizações, integrações e correções de interface implementadas hoje (24/04/2026) no sistema Siding Depot.

---

## 1. Integração Webhook ClickOne (`route.ts`)
Foco em corrigir a inicialização de novos projetos via webhook, garantindo a atribuição correta e o status de agendamento padronizado.

- **Mapeamento de Vendedores (Salesperson):** Corrigida a lógica de atribuição. O sistema agora mapeia flexivelmente os vendedores (priorizando `VendedorOP` sobre `VendedorUser`), utilizando o alias correto (ex: convertendo o alias para `"Matheus"` no banco de dados) para evitar atribuições nulas e perdas de comissão.
- **Status Inicial do Projeto:** Removida a configuração fixada em `"tentative"`. Todo novo projeto criado via webhook agora é forçado a nascer com o `job_start_status` igual a `"pending"`, unificando a esteira operacional da equipe.

---

## 2. Infraestrutura em Tempo Real (Supabase Realtime)
O sistema foi configurado para reagir instantaneamente às alterações no banco de dados, sem necessidade de recarregar a página (F5).

- **Ativação da Publication:** Configurado o `ALTER PUBLICATION supabase_realtime` via SQL para habilitar a transmissão de eventos nas tabelas `jobs`, `service_assignments` e `sales_snapshots`.
- **Sincronização Ativa:** A reatividade instantânea via `supabase.channel` foi implementada e validada com sucesso nas telas de **Projects**, **Sales Reports** e **Schedule**.

---

## 3. Módulo de Projetos (`projects/page.tsx`)
Melhorias focadas na ordenação visual e clareza de dados no dashboard principal.

- **Ordenação em Tempo Real:** A query principal de listagem foi revertida para ordenar por `created_at` (descendente) no lugar de `contract_signed_at`. Isso garante precisão de micro-segundos, fazendo com que novos projetos disparados pelo webhook surjam instantaneamente na primeira linha do grid.
- **Refatoração da Coluna "Title":** A exibição de dados redundantes de serviço/título foi oculta. A coluna agora extrai e apresenta *apenas* o **Nome do Cliente**, simplificando a leitura da equipe.

---

## 4. Módulo de Serviços (`services/page.tsx` & `NewServiceCallModal`)
Aprimoramentos de Usabilidade (UX) e facilitação de busca de requisições e clientes.

- **Novo Filtro de Busca Integrado:** Adicionada uma barra de pesquisa responsiva no topo direito da tela (perfeitamente alinhada ao botão de *Export*). O input filtra simultaneamente por Nome do Cliente, Título da requisição ou Número do Job (`SD-2026...`).
- **Nomes de Clientes na Tabela:** A query de busca do banco de dados foi enriquecida (`jobs ( ..., customer:customers(full_name) )`). A coluna "Project" na listagem de serviços agora exibe o **Nome do Cliente** com clareza (excluindo os títulos redundantes).
- **Modal "New Service Call":** O Dropdown de seleção de projeto foi aprimorado. Foi habilitada a função de *Search*, e a lista passou a renderizar exclusivamente os **Nomes dos Clientes**, removendo a sobrecarga de códigos e serviços.
- **Fix TypeScript (Build):** Corrigido um erro do Next.js de inferência de tipos em tempo de compilação, manipulando graciosamente as instâncias em que o Supabase retornava a junção (`join`) como *array* de clientes.

---

## 5. Módulo de Change Orders (`change-orders/page.tsx` & `CreateChangeOrderModal`)
Uniformização dos componentes de seleção de projetos.

- **Dropdown de Projetos (Busca Otimizada):** O modal de criação de Change Order teve o seu Dropdown de projetos configurado como pesquisável (`searchable={true}`).
- **Visualização Limpa:** A lista de seleção, que antes mostrava o código completo (ex: `SD-2026-6345 — Chris White`), foi alterada para renderizar estritamente o **Nome do Cliente** (`Chris White`). Adicionado tratamento de *fallback* para exibir o código do projeto apenas se um projeto antigo tiver dados de cliente ausentes no banco.

---

**Ambiente e Deploy:**
- Todo o código foi validado para evitar erros de compilação no servidor.
- Os pacotes de alterações foram "commitados" atomizados por funcionalidade.
- A `main` do GitHub foi atualizada com todas essas alterações (produção imediata).
