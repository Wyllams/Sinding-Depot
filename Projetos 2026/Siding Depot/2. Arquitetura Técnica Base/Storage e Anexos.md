# 📦 Storage e Anexos

O ecossistema Siding Depot não é apenas voltado para dados tabulares, geramos e armazenamos diversos arquivos físicos que compõem o escopo do projeto, como provas visuais, aditamentos e [[Documentos e Contratos Digitais|contratos]]. O Supabase Storage Bucket resolve tudo isso.

## Buckets Principais do Supabase

### 1. `job_assets`
- **Uso:** Imagens e vídeos upados pelas crews diretamente do aplicativo, ou por salespeople reportando problemas, medições ou referências de color matching.
- **Padrão de Nome (Upload):** `{job_id}/photos/{timestamp}-{filename}.{ext}`
- **Política de RLS:** Leitura liberada com expiração de Token assinado. Upload permitido para Staff autenticado.

### 2. `change_orders`
- **Uso:** PDFs formalizando as mudanças de escopo e valor de uma obra já iniciada (as "Change Orders").
- **Padrão de Nome:** `{job_id}/co_{co_number}.pdf`
- **Por que é separado?** Porque os change orders carregam pesos jurídicos. Eles são lincados na tabela de Cash Payments e representam a cobrança real (dinheiro) em cima do contrato original.

## Upload Seguro no Frontend

Jamais mandamos base64 via rota API de Next.js. O fluxo correto é:
1. O Client pede um URL Assinado (Signed URL) para o Supabase.
2. O arquivo faz o upload direto do Browser (React UI) para o bucket AWS S3 do Supabase via TUS protocol ou multipart form.
3. Isso salva nossa banda no Vercel (Next.js serverless functions tem limite severo de timeout e size).

---
**Relações (Map):**
- Ponto de integração dos Change Orders que originam os arquivos: [[Módulo - Cash Payments (Financeiro)]]
- Mais infos sobre o banco de dados que guarda os metadados dos arquivos: [[Arquitetura do Banco de Dados]]
