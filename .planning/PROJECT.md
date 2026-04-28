# Siding Depot

## Vision
Plataforma SaaS completa para contractors de serviços exteriores (siding, paint, gutters, roofing, doors/windows/decks) em operação no Sudeste dos EUA (Georgia). Digitaliza todo o ciclo operacional: lead intake → contrato → agendamento de crews → execução → financeiro → portal do cliente.

## Problem
- Agendamento manual via planilhas/quadros brancos
- Sem visibilidade de disponibilidade de crews
- Cash payments rastreados em papel
- Change orders comunicados verbalmente
- Clientes sem visibilidade de status do job
- Vendedores sem pipeline de vendas
- Lógicas de calendário quebrando em produção

## Current State
Plataforma v1 em produção servindo uma empresa real com 3 vendedores, ~12 crews e 5 categorias de serviço. O sistema possui 4 portais distintos (Admin, Vendedor, Crew, Cliente) mas há 14 itens críticos de manutenção pendentes — bugs em lógicas do calendário, inconsistências de UI, e features incompletas que precisam ser corrigidos para estabilizar o v1.

## Stack
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript strict
- **Styling:** Tailwind CSS v4 + CSS Modules
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Realtime + Storage)
- **Hosting:** Vercel (Edge Network) + GitHub CI/CD
- **Integrações:** Cloudflare R2, Resend, Web Push API, Weather API
- **i18n:** next-intl (EN, PT, ES)

## Constraints
- **Zero downtime:** Sistema em produção real, alterações não podem quebrar fluxos existentes
- **Sem testes automatizados:** Toda validação é manual — testes serão adicionados incrementalmente
- **Mega-files:** `projects/[id]/page.tsx` (254KB) e `schedule/page.tsx` (72KB) requerem cuidado extremo ao editar
- **RLS ativo:** Todas as tabelas sensíveis têm Row-Level Security — alterações de schema precisam considerar policies
- **Ordem sequencial:** Os 14 itens devem ser executados na ordem 1→14 sem pular

## Success Criteria
Todos os 14 itens de manutenção implementados e funcionando 100% sem erros em produção. O calendário (schedule) estável, drag-and-drop funcional, Change Orders com UI correta no portal do cliente, COC com metadados completos, e sorting correto em todas as tabelas.
