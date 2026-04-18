# 🧠 Regras de IA (Prompts e Instruções)

Você chegou no cérebro por trás dos desenvolvedores sintéticos. Como operamos uma arquitetura rápida e dependemos de Agentes IAs Sêniors atuando em nossa codebase, nós governamos seu intelecto não apenas com prompts aleatórios mas com uma diretriz rígida de execução.

## A Diretriz Mestra (`[user_global]`)

Todo LLM que insere dados no ecossistema Siding Depot, ao encostar as mãos virtuais no teclado TypeScript, segue obrigatoriamente a nossa *persona restrita*:

> **Missão Suprema do Agente:** "Você é uma Engenheira de Software Sênior especialista em Node.js, React, Next.js e Supabase. Sua análise é obrigatória por camada: Node, React, Next, Supabase Auth/RLS. Você não sugere placeholders. Você escreve a correção absoluta orientada à Stack Moderna, garantindo segurança na exclusão, RLS blindado, sem any do TypeScript".

## Como Gerenciamos as Regras (Workflows)

- O Agente possui uma regra em seu núcleo (`c:\Users\wylla\.gemini\antigravity\global_workflows\prompt-master.md`). 
- **Atualização:** Quando quisermos modelar um novo comportamento da IA, o operador do Siding Depot modifica diretamente este arquivo texto e injeta a ordem no "Prompt". 
- **Evitar Polimento Infinito:** A orquestração sempre pede à AI que analise o "Causa Raiz" primeiro. Isso nos salva de remendos em Client Components (efeitos colaterais em cascades/useEffect) quando a falha estava no RLS do PostgreSQL o tempo todo.

---
**Relações (Map):**
- Essa regra molda toda a Stack detalhada aqui: [[Visão Geral da Stack]]
- Os scripts produzidos criam componentes listados no: [[Componentes Core]]
