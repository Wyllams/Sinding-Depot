---
tags:
  - auth
  - rbac
  - permissions
  - siding-depot
created: 2026-04-18
---

# 🔐 Níveis de Acesso e Permissões (Siding Depot)

> Voltar para [[Siding Depot — Índice]] | Ver também [[Autenticação e Controle de Acesso]]

Este documento centraliza as regras de negócio de **Controle de Acesso Baseado em Cargos (RBAC)** do sistema, garantindo que front-end e banco de dados (Row Level Security no Supabase) conversem na mesma linguagem.

---

## 👑 1. Administrador (Admin)
- **Acesso Global:** Acesso completo e irrestrito a todas as páginas, configurações, métricas da empresa, relatórios financeiros e painéis do sistema.
- **Visibilidade:** Todas as vendas, todos os usuários (vendedores, instaladores e clientes) e total responsabilidade administrativa.

---

## 💼 2. Vendedor (Salesperson)
- **Escopo Geral:** Acesso restrito e focado na sua própria performance e carteira de clientes.
- **Módulos Acessíveis:**
  - **Dashboard:** Informações e métricas referentes unicamente ao próprio vendedor (metas atingidas, etc).
  - **Projetos:** Visibilidade apenas da lista de projetos atrelados à sua titularidade.
  - **Ordens de Alteração (Change Orders):** Apenas lê e envia COs pertencentes aos próprios projetos.
  - **Relatórios:** Permissão para consultar relatórios das **suas** vendas.
- **Restrição Crítica:** Proibido visualizar faturamento ou projetos pertencentes a outros vendedores e diretores.

---

## 🧰 3. Instalador / Parceiro (Crew)
- **Escopo Geral:** Foco 100% tático (execução de obra). **Restrição total de visualização de valores financeiros ($$).**
- **Módulos Acessíveis:**
  - **Calendário / Schedule:** Visão estrita das suas próprias datas de agendamento (incluindo gerenciar agenda de uma 2ª equipe local, caso administrem).
  - **Projetos (Visão do Instalador):** 
    - Ver nome e endereço do cliente.
    - Ver via do contrato assinado (censo de responsabilidade do que foi fechado), **sem exibir valores**.
  - **Change Orders:** Pode visualizar apenas Ordens de Alteração **Aprovadas** que impactem sua execução (SEM PREÇOS).
  - **Interações na Obra (Ações no sistema):**
    - 👉 **Botão de Material Extra:** Formulário rápido para solicitar falta de material no canteiro.
    - 👉 **Botão de Adicional/Alerta:** Comunicação direta com o Vendedor para relatar surpresas ou sugerir add-ons.
  - **Certificado de Conclusão (COC - Certificate of Completion):**
    - **Acesso Isolado por Disciplina:** O instalador de Siding só interage com o COC de Siding; o instalador de Janelas só do de Janelas.
    - Permissão para coletar a assinatura touch do cliente "na tela do celular do instalador" caso o cliente não tenha assinado remotamente.

---

## 👤 4. Cliente (Customer Portal)
- **Escopo Geral:** Visão passiva e de aprovações da sua própria reforma.
- **Módulos Acessíveis:**
  - **Calendário de Serviço:** Transparência de quando a obra começa, quando entregam o material, etc.
  - **Ordens de Alteração (Change Orders):** Visualizar ativamente as ordens de serviços geradas pelo Vendedor e **Aprovar** ou **Recusar** digitalmente.
  - **Documentação e Certificados:** Visualizar e consultar suas aprovações e Certificados de Conclusão (COCs).
