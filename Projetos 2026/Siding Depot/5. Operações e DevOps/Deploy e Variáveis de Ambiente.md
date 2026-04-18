# 🚀 Deploy e Variáveis de Ambiente

Onde hospedamos nosso código e como as "chaves de casa" são gerenciadas, isolando o ambiente de teste local do ambiente de produção.

## Hospedagem na Vercel

Por utilizarmos **Next.js**, o destino primário é o ecossistema Serverless da Vercel. 
O deploy é automático via integração direta (GitHub Oauth link). A cada commit que pousa na branch `main`, a Vercel engatilha os Server Actions e roda o App Router Build e lança live.

## O Tesouro Secreto (`.env.local`)

As chaves do projeto jamais podem subir pro repositório central público ou privado (se vazadas, vazam os dados dos clientes).
No projeto real, o `.env.local` contém:

*   `NEXT_PUBLIC_SUPABASE_URL` = Rota Endpoint da API Supabase (Exposta para Cliente).
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Chave pública anonimizada (Garante acesso ao Role padrão para fazer requisições sem login de CRUDs básicos não sensíveis).
*   **Chaves de Automação (Se houver futuramente):** Twilio (Para OTP phone), AWS, Sengrid (Emails customizados para clientes base de login).

## Monitoramento (Health)
Logs estourados do Edge (Vercel Console) devem ser batidos caso ocorra "Vercel Timeout" das server functions (limite de banda/tempo). Quando anexos imensos pesam, utilizamos os urls assinadas justamente pra desafogar essa latência.

---
**Relações (Map):**
- Infraestrutura descrita fisicamente: [[Visão Geral da Stack]]
