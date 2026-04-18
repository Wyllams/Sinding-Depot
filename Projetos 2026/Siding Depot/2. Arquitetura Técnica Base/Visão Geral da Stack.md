# ☁️ Visão Geral da Stack

O portal Siding Depot é um sistema web moderno que alia altíssima performance no frontend com robustez pragmática no ecossistema do banco de dados e autenticação. Esta arquitetura foi montada pensando em **Zero Ops** (não nos preocuparmos com gerenciamento de servidores).

## A Stack Tecnológica

- **Front-end / Meta-framework:** Next.js (App Router). Permanece híbrido entre Server Components para puxar dados sigilosos direto da raiz e Client Components para as animações e modais interativos. React 19 em vigor.
- **Linguagem Principal:** TypeScript (Tipagem estrita; `any` é evitado como a peste).
- **Estilização e UI:** Tailwind CSS (Utilitário). Não usamos frameworks pesados corporativos para manter a liberdade do design glassmorphism e micro-interações.
- **Back-end & Banco de Dados:** Supabase (PostgreSQL sob o capô), cuidando de Auth, Storage e APIs GraphQL/REST pré-geradas (Client via @supabase/supabase-js).
- **Validation:** Zod para garantir que os inputs das formas da UI batam direto com os esquemas desejados.
- **Hospedagem & CI/CD:** Vercel no edge.

## Padrões Adotados (Convenções)

- Usamos Client Components `use client` apenas nas "folhas" da árvore (modais, botões, formulários). O esqueleto da página e as requisições de banco devem pertencer aos componentes do servidor.
- As integrações sensíveis e webhooks nunca devem expor a `NEXT_PUBLIC_SUPABASE_ANON_KEY`, e sim utilizar conexões diretas protegidas ou rotas `/api` do App Router agindo como Server Actions, habilitando também [[Notificações em Tempo Real]].

---
**Relações (Map):**
- Veja as variáveis de deploy vinculadas a esta infra: [[Deploy e Variáveis de Ambiente]]
- Entenda o mapa de dependências de hardware/banco: [[Arquitetura do Banco de Dados]]
- Estrutura gráfica de KPIs para usuários finais: [[Dashboard]]
