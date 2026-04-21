# 🚀 RikoSEO (RikoGMB) — Documentação Completa do Projeto

> **Plataforma SaaS de SEO Local com Inteligência Artificial**
> Presença Digital no Piloto Automático para Negócios Locais Brasileiros

---

## 📋 Índice

1. [[#Visão Geral]]
2. [[#Para que Serve]]
3. [[#Stack Tecnológica]]
4. [[#Arquitetura do Sistema]]
5. [[#Funcionalidades Completas]]
6. [[#Sistema de Agentes de IA]]
7. [[#Planos e Monetização]]
8. [[#Banco de Dados (Schema)]]
9. [[#Integrações Externas]]
10. [[#Sistema de Autenticação]]
11. [[#SEO Técnico Automático]]
12. [[#Cron Jobs (Automações)]]
13. [[#Subdomínios e Multi-tenancy]]
14. [[#Como Rodar o Projeto]]
15. [[#Variáveis de Ambiente]]
16. [[#Deploy e Infraestrutura]]
17. [[#Fluxo de Uso do Cliente]]
18. [[#Roadmap Futuro]]

---

## Visão Geral

**RikoSEO** (comercialmente chamado de **RikoGMB**) é uma plataforma SaaS (Software as a Service) brasileira focada em **SEO Local** para pequenos e médios negócios. A plataforma funciona como um "Funcionário de Marketing Sênior Digital 24/7" que automatiza e otimiza toda a presença do negócio no Google — desde o **Google Meu Negócio (GMB)** até **Blog, Landing Pages, Avaliações e Rank Tracking**.

### Proposta de Valor

> **46% das buscas globais no Google têm intenção local.** Se o negócio não aparece de forma otimizada, o cliente vai para a concorrência. O RikoSEO resolve isso automaticamente.

### Público-Alvo

- Barbearias, Salões de Beleza
- Clínicas e Consultórios
- Restaurantes e Cafeterias
- Academias
- Farmácias
- Pet Shops
- Lojas e Comércios
- Profissionais de Serviços (encanador, eletricista, etc.)
- Escolas e Cursos
- Qualquer negócio local brasileiro

### URL de Produção

- **Domínio Principal:** `rikoseo.com.br`
- **Subdomínios de Clientes:** `{slug}.rikoseo.com.br` (ex: `barbearia-joao.rikoseo.com.br`)
- **Deploy:** Vercel (rikoseo.vercel.app)

---

## Para que Serve

O RikoSEO resolve **6 problemas críticos** de negócios locais:

| Problema | Solução RikoSEO |
|----------|----------------|
| Perfil do Google desatualizado | Agente de Perfil GMB analisa completude e sugere melhorias via IA |
| Avaliações sem resposta | Agente de Avaliações detecta sentimento e responde automaticamente |
| Sem conteúdo no Google | Agente de Posts gera postagens otimizadas semanalmente |
| Sem blog / artigos | Agente de Blog cria artigos longos, EEAT, com Schema e FAQ |
| Não sabe onde rankeia | Rank Tracker + Google Search Console integrado |
| Informações divergentes na web | Verificador NAP detecta inconsistências (Nome, Endereço, Telefone) |

---

## Stack Tecnológica

### Frontend

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| **Next.js** | 16.2.2 | Framework React com App Router |
| **React** | 19.2.4 | Biblioteca de UI |
| **TypeScript** | 5.x | Tipagem estática |
| **Tailwind CSS** | 3.4.19 | Framework CSS utilitário |
| **Recharts** | 3.8.1 | Gráficos de evolução e analytics |
| **Lucide React** | 1.7.0 | Ícones |
| **Sonner** | 2.0.7 | Notificações toast |
| **React Hook Form** | 7.x + Zod 4.x | Formulários com validação |
| **TanStack Table** | 8.21.3 | Tabelas interativas e paginação |

### Backend

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| **Next.js API Routes** | 16.2.2 | Server Actions + Route Handlers |
| **Drizzle ORM** | 0.45.2 | ORM type-safe para PostgreSQL |
| **Better Auth** | 1.5.6 | Autenticação com Google OAuth |
| **Zod** | 4.3.6 | Validação de schemas |

### IA & APIs

| Tecnologia | Uso |
|-----------|-----|
| **Google Gemini** (gemini-2.5-flash / gemini-3.1-pro) | Geração de textos, análise de sentimento, posts, artigos, descrições |
| **Google Search Console API** | Dados reais de tráfego e keywords |
| **Google My Business API** | Sincronização de reviews, posts e perfil |
| **Google Autocomplete** | Pesquisa gratuita de palavras-chave |
| **Unsplash API** | Imagens profissionais para posts e artigos |
| **Brasil API** | Feriados nacionais para alertas |

### Infraestrutura

| Serviço | Uso |
|---------|-----|
| **Vercel** | Hosting + Serverless Functions + Cron Jobs |
| **Supabase (PostgreSQL)** | Banco de dados principal |
| **Asaas** | Gateway de pagamentos (PIX, Cartão, Boleto) |
| **Resend** | Envio de emails transacionais |

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 16)                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Landing Page │  │  Dashboard   │  │  Sites/Subdom.   │   │
│  │  (Marketing)  │  │  (SaaS App)  │  │  (Clientes)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                           │                                  │
│  ┌────────────────────────┴──────────────────────────────┐   │
│  │              MIDDLEWARE (Subdomínios + Auth)           │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (API Routes)                      │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  │
│  │ /api/auth │  │ /api/cron │  │ /api/    │  │ /api/    │  │
│  │           │  │           │  │ negocios │  │ webhooks │  │
│  └───────────┘  └───────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   AGENTES DE IA (lib/agents)                 │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Reviews  │ │  Posts   │ │   Blog   │ │ Perfil GMB    │  │
│  │ Agent    │ │  Agent   │ │  Agent   │ │ Agent         │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ NAP      │ │ Ranking  │ │ Score    │ │ Feriados      │  │
│  │ Checker  │ │ Tracker  │ │ Calc.    │ │ Agent         │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     BANCO DE DADOS                           │
│                    (Supabase/PostgreSQL)                      │
│                                                             │
│  negocios │ artigos │ postagens │ avaliacoes │ landing_pages │
│  palavras_chave │ historico_ranking │ verificacoes_nap      │
│  pontuacoes_presenca │ execucoes_agente │ users │ sessions  │
└─────────────────────────────────────────────────────────────┘
```

---

## Funcionalidades Completas

### 1. Dashboard (Visão Geral)

**Rota:** `/painel`

O Dashboard é a "cabine de comando" do negócio. Exibe:

- **Score de Presença SEO** (0-100 pontos): Calculado pela soma dos 4 pilares:
  - 🏢 **Força do GMB** (0-25 pts): Perfil completo + posts recentes + GMB conectado
  - ⭐ **Avaliações & Notas** (0-25 pts): Nota média + quantidade + taxa de resposta
  - 🌐 **Qualidade do Site/SEO** (0-25 pts): Landing pages + keywords + NAP consistente
  - ✍️ **Atividade no Blog** (0-25 pts): Artigos publicados + frequência

- **Gráfico de Evolução Temporal** (Recharts)
- **Linha do Tempo de Atividades Recentes da IA** (ex: "Ontem escrevi 1 post para você")
- **Alertas de Feriados Próximos** (Brasil API)
- **Botão "Recalcular Score IA"** com cálculo em tempo real

### 2. Perfil GMB

**Rota:** `/painel/perfil-gmb`

- Checklist de completude do perfil (0-100%)
- Campos avaliados com pesos: Nome (15%), Categoria (10%), Endereço (15%), Telefone (10%), Website (10%), Descrição (15%), Logo (10%), GMB Conectado (15%)
- Recomendações automáticas para campos faltantes
- **Gerador de Descrição via IA**: Cria descrição otimizada para SEO (máx 750 chars) usando Gemini
- Conexão OAuth com Google My Business

### 3. Avaliações (Reviews)

**Rota:** `/painel/avaliacoes`

- Listagem de todas as avaliações sincronizadas do GMB
- Filtro por **Sentimento** (Positivo 🟢 / Neutro 🟡 / Negativo 🔴)
- **Resposta via IA (1 clique)**: O agente Gemini analisa o contexto e gera uma resposta profissional, cordial e otimizada para SEO, incluindo o nome do negócio e categoria de forma natural
- Detecção automática de sentimento (análise via IA)
- Sincronização automática a cada 6 horas (Cron Job)
- Alerta de reviews negativos por email

### 4. Postagens GMB

**Rota:** `/painel/postagens`

- Editor intuitivo para criar postagens no Google Meu Negócio
- Tipos suportados: **NOVIDADE**, **OFERTA**, **EVENTO**
- **Geração via IA**: Define palavra-chave ou instrução → IA gera copy persuasivo com:
  - Ganchos fortes de abertura
  - Call To Action (CTA) personalizado
  - 2-4 emojis estratégicos
  - Hashtags relevantes
- Imagem automática do Unsplash (termo de busca em inglês gerado pela IA)
- Status: RASCUNHO → PUBLICADO / AGENDADO

### 5. Blog SEO (EEAT)

**Rota:** `/painel/blog`

- Gerador de artigos longos e otimizados via Gemini
- Estrutura EEAT (Experiência, Especialidade, Autoridade, Confiança)
- Cada artigo gerado inclui:
  - Título otimizado com palavra-chave
  - Meta descrição persuasiva (120-155 chars)
  - Blocos de conteúdo estruturados (H2, H3, parágrafos, listas)
  - 3-4 FAQs com Schema Markup automático
  - Imagem hero via Unsplash
  - Internal Linking automático com artigos existentes
  - Word count e tempo de leitura calculados
- Status: RASCUNHO → PUBLICADO → ARQUIVADO
- Links canônicos e sitemap automático

### 6. Landing Pages

**Rota:** `/painel/site`

- Construtor de Landing Pages sem código
- Foco em **um único serviço** por página (alta conversão)
- Geração de conteúdo via IA:
  - Headline impactante (máx 70 chars)
  - Subtítulo com diferencial e benefícios
  - FAQ persuasivo (4-5 perguntas)
  - Meta tags SEO otimizadas
  - Imagem de destaque via Unsplash
- Schema Markup JSON-LD automático (LocalBusiness + FAQPage)
- Tom de voz configurável: Profissional / Descontraído / Agressivo
- WhatsApp CTA integrado
- Publicação em subdomínio: `{slug}.rikoseo.com.br`

### 7. Palavras-Chave (Keyword Research)

**Rota:** `/painel/palavras-chave`

- Pesquisador de keywords via **Google Autocomplete** (gratuito, sem API key)
- Variações automáticas:
  - Busca base + cidade
  - Prefixos comuns: "como", "melhor", "onde", "qual", "preço"
  - Sufixos geo-locais: "perto de mim", "aberto agora"
- Classificação automática por heurísticas:
  - **PRIMARY**: 1 palavra (head term)
  - **SECONDARY**: 2-3 palavras
  - **LONG_TAIL**: 4+ palavras
  - **TRANSACTIONAL**: contém "comprar", "preço", "agendar", "orçamento"
  - **INFORMATIONAL**: contém "como", "o que é", "dicas", "guia"
- Deduplicação e ordenação por prioridade

### 8. Ranking (Rank Tracking)

**Rota:** `/painel/ranking`

- Monitoramento de posição no Google Search e Google Maps
- Duas fontes de dados:
  - **Search Console real** (plano Pro+): Dados dos últimos 28 dias via API oficial
  - **Estimativa** (outros planos): Heurísticas baseadas no tipo de keyword
- Histórico temporal por keyword
- Visualização de subidas/descidas
- Fontes marcadas: `SEARCH_CONSOLE` ou `ESTIMATIVA`

### 9. Analytics

**Rota:** `/painel/analytics`

- Métricas de tráfego orgânico:
  - **Cliques** totais
  - **Impressões** nos resultados de busca
  - **CTR** (Taxa de Cliques)
  - **Posição Média** geral
- Dados reais do Search Console (Pro+) ou estimativas proporcionais
- Gráficos de evolução por data

### 10. NAP Check (Verificador de Consistência)

**Rota:** `/painel/nap`

- Auditoria de consistência **Nome, Endereço, Telefone (NAP)** entre múltiplas fontes:
  - Perfil do cadastro (referência)
  - Landing Pages do subdomínio
  - Website externo (scraping via fetch + regex)
  - Google Meu Negócio
- Normalização de texto (acentos, maiúsculas, espaços)
- Normalização de telefone (remove formatação)
- Score de consistência (0-100%)
- Problemas detalhados por fonte
- Resultados salvos no banco para histórico

### 11. Relatórios

**Rota:** `/painel/relatorios`

- Geração de relatório gerencial completo
- Conquistas e progressos
- Alertas de feriados e ações sugeridas
- Exportável como PDF Premium
- Relatório semanal avançado por email (plano Pro+)

### 12. Cobrança (Checkout)

**Rota:** `/painel/cobranca`

- Integração completa com **Asaas**
- Métodos de pagamento: PIX, Cartão de Crédito, Boleto
- Fluxo PIX: Gerar cobrança → QR Code + Copia-e-Cola → Webhook confirmação
- Assinaturas recorrentes (mensal)
- Status de plano: TRIAL → ACTIVE → PAST_DUE → CANCELLED

### 13. Configurações

**Rota:** `/painel/configuracoes`

- Dados do negócio
- Configurações do site IA (serviços, cor primária, WhatsApp, tom de voz, imagem destaque)
- Gerenciamento de plano e assinatura

---

## Sistema de Agentes de IA

O RikoSEO possui **9 agentes de IA** independentes, todos baseados no Google Gemini:

### Agente de Avaliações (`agente-avaliacoes.ts`)

| Parâmetro | Descrição |
|-----------|-----------|
| **Modelo** | Gemini 3.1 Pro |
| **Input** | Nota, texto da avaliação, nome do cliente, negócio, categoria |
| **Output** | Sentimento (POSITIVO/NEGATIVO/NEUTRO) + Resposta sugerida |
| **Schema** | Validado com Zod |
| **Regras** | Tom profissional e cortês; inclui nome do negócio para SEO; se negativa, oferece resolução |

### Agente de Posts GMB (`agente-posts.ts`)

| Parâmetro | Descrição |
|-----------|-----------|
| **Modelo** | Gemini 2.5 Flash |
| **Input** | Nome do negócio, categoria, instrução personalizada |
| **Output** | Conteúdo (300-600 chars), tipo (NOVIDADE/OFERTA/EVENTO), termo imagem |
| **Regras** | Gancho forte, CTA final, 2-4 emojis, máx 1500 chars |

### Agente de Blog (`agente-blog.ts`)

| Parâmetro | Descrição |
|-----------|-----------|
| **Modelo** | Gemini 2.5 Flash |
| **Input** | Negócio, categoria, tema, cidade, artigos existentes (internal linking) |
| **Output** | Título, meta descrição, palavra-chave, KWs secundárias, blocos de conteúdo, FAQ, termo imagem |
| **Regras** | Mín 8 blocos, EEAT, keyword no título + intro + H2, 3-4 FAQs, CTA orgânico |

### Agente de Perfil GMB (`agente-perfil-gmb.ts`)

| Parâmetro | Descrição |
|-----------|-----------|
| **Modelo** | Gemini 2.5 Flash |
| **Função** | Analisa completude do perfil, gera score 0-100%, lista recomendações, e cria descrição otimizada para SEO (máx 750 chars) |

### Verificador NAP (`verificador-nap.ts`)

| Descrição |
|-----------|
| Compara NAP entre Perfil/Landing Pages/Website/GMB. Faz scraping de websites com regex para telefones BR e endereços. Salva resultados no banco. |

### Rastreador de Ranking (`rastreador-ranking.ts`)

| Descrição |
|-----------|
| Usa Search Console real (se conectado) ou heurísticas simuladas. Mapeia keywords cadastradas para posições reais. Gera posição Search + posição Maps. |

### Calculador de Score (`calculador-score.ts`)

| Descrição |
|-----------|
| Calcula score de presença em 4 pilares de 25 pts cada. Busca dados (reviews, posts, artigos, LPs, keywords, NAP) em paralelo. Salva no banco para histórico. |

### Agente de Feriados (`agente-feriados.ts`)

| Descrição |
|-----------|
| Consome a Brasil API para alertar sobre feriados nacionais próximos. Cache de 24h. Classifica proximidade: HOJE, AMANHÃ, ESTA_SEMANA, PRÓXIMO, FUTURO. |

### Gerador de Site / Landing Page (`gerar-site.ts`)

| Descrição |
|-----------|
| Gera conteúdo textual completo para Landing Pages via Gemini. Headline (70 chars), subtítulo, FAQ, meta tags, termo de imagem. 3 tons de voz disponíveis. |

---

## Planos e Monetização

### Tabela Comparativa de Planos

| Recurso | Starter (R$97/mês) | Pro (R$197/mês) | Pro+ (R$297/mês) |
|---------|:---:|:---:|:---:|
| Posts semanais GMB | 1 | 2 | 4 |
| Resposta IA de avaliações | ✅ | ✅ | ✅ |
| Score de presença | ✅ | ✅ | ✅ |
| Alerta reviews negativos | ✅ | ✅ | ✅ |
| Site/Subdomínio profissional | ❌ | ✅ | ✅ |
| Blog SEO com artigos IA | ❌ | ✅ (4/mês) | ✅ (ilimitado) |
| Landing Pages | ❌ | ✅ (máx 5) | ✅ (máx 20) |
| Schema Markup completo | ❌ | ✅ | ✅ |
| Verificador NAP | ❌ | ✅ | ✅ |
| Pesquisador de Keywords | ❌ | ✅ | ✅ |
| Google Search Console | ❌ | ❌ | ✅ |
| Rank Tracking | ❌ | ❌ | ✅ |
| Analytics completo | ❌ | ❌ | ✅ |
| Relatório avançado por email | ❌ | ❌ | ✅ |
| Suporte prioritário | ❌ | ❌ | ✅ |
| Máx negócios | 1 | 1 | 1 |

### Feature Gate

O sistema utiliza um componente `<FeatureGate>` que bloqueia funcionalidades premium com uma tela elegante mostrando:
- Ícone de cadeado
- Qual plano é necessário
- Botão de upgrade direcionando para `/painel/cobranca`

### Períodos

- **TRIAL**: Período de teste gratuito
- **ACTIVE**: Assinatura ativa
- **PAST_DUE**: Pagamento atrasado
- **CANCELLED**: Assinatura cancelada

---

## Banco de Dados (Schema)

O banco utiliza **PostgreSQL via Supabase** com **Drizzle ORM**. São 12 tabelas principais:

### Tabelas Principais

| Tabela | Descrição | Campos principais |
|--------|-----------|-------------------|
| `negocios` | Negócio cadastrado | nome, slug, categoria, cidade, gmb tokens, plano, status, site config |
| `artigos` | Artigos do blog SEO | titulo, slug, conteudo (JSON), meta, keywords, FAQ schema, status |
| `postagens` | Posts do GMB | conteudo, imagem, tipo, status, gmbPostId |
| `avaliacoes` | Reviews do Google | autor, nota, texto, sentimento, respondido, resposta |
| `landing_pages` | Páginas de serviço | servicoFoco, headline, subtitulo, FAQ, whatsapp, ativo |
| `palavras_chave_negocio` | Keywords monitoradas | palavraChave, volume, dificuldade, tipo |
| `historico_ranking` | Histórico de posições | palavraChave, posicao, posicaoMaps, fonte |
| `verificacoes_nap` | Auditorias NAP | fonte, nome, endereco, telefone, consistente, problemas |
| `pontuacoes_presenca` | Scores calculados | total (0-100), gmb (0-25), avaliacoes, site, blog |
| `execucoes_agente` | Log de execuções IA | tipo agente, status, resultado, tokens, duração |
| `user` | Usuários (Better Auth) | id, name, email |
| `session` | Sessões ativas | token, userAgent, ip, expiresAt |

### Enums no Banco

```
plano: STARTER | PRO | PRO_PLUS
status_plano: TRIAL | ACTIVE | PAST_DUE | CANCELLED
categoria_negocio: RESTAURANTE | CLINICA | BARBEARIA | ACADEMIA | FARMACIA | SALAO_DE_BELEZA | PET_SHOP | LOJA | SERVICOS | EDUCACAO | BELEZA_ESTETICA | OUTRO
sentimento: POSITIVO | NEGATIVO | NEUTRO
status_artigo: RASCUNHO | PUBLICADO | ARQUIVADO
tipo_postagem: NOVIDADE | OFERTA | EVENTO
status_postagem: RASCUNHO | PUBLICADO | AGENDADO | FALHOU
tipo_agente: GMB | AVALIACOES | BLOG | SITE | GMB_PERFIL | RANK_TRACKER | RELATORIO | NAP_CHECK
status_execucao: PENDENTE | EXECUTANDO | SUCESSO | FALHOU
tipo_palavra_chave: PRIMARY | SECONDARY | LONG_TAIL | INFORMATIONAL | TRANSACTIONAL
```

---

## Integrações Externas

### Google OAuth (Better Auth)

- **Scopes**: Profile, Email, Business.Manage, Webmasters.Readonly
- **Tipo de acesso**: Offline (refresh tokens)
- **Prompt**: Consent (sempre pede permissão)
- Tokens criptografados com AES antes de salvar no banco

### Google My Business API

- Sincronização de reviews (a cada 6h via Cron)
- Publicação de posts
- Leitura de dados do perfil
- API: `googleapis` v171

### Google Search Console API

- Keywords que geram tráfego (cliques, impressões, CTR, posição)
- Top páginas por performance
- Performance agrupada por data (para gráficos)
- Scope: `webmasters.readonly`

### Asaas (Pagamento)

- **Sandbox** e **Produção** configuráveis via env
- Funcionalidades:
  - Buscar/Criar cliente por CPF/CNPJ
  - Criar assinatura recorrente (mensal)
  - Criar cobrança PIX avulsa
  - Obter QR Code PIX (imagem + payload copia-e-cola)
- Webhooks para confirmação de pagamento

### Resend (Email)

- Emails transacionais
- Templates React Email (`@react-email/components`)
- Alertas de reviews negativos
- Relatórios semanais avançados

### Unsplash API

- Busca de imagens profissionais gratuitas
- Termos de busca gerados pela IA em inglês
- Usado em posts, artigos e landing pages

### Brasil API

- Feriados nacionais do ano
- Cache em memória de 24h
- Endpoint: `brasilapi.com.br/api/feriados/v1/{ano}`

---

## Sistema de Autenticação

### Better Auth

- Login com **Google OAuth** (provedor social principal)
- Login com **Email + Senha** (bypass)
- Sessão: 7 dias de validade, renovação diária
- Cookie cache: 5 minutos
- Origens confiáveis: `localhost:3000` e `rikoseo.vercel.app`

### Middleware

O middleware Next.js cuida de 3 responsabilidades:

1. **Extração de subdomínio**: Detecta `{slug}.rikoseo.com.br` ou `?subdomain=` em dev
2. **Proteção de rotas**: `/painel/*` requer sessão ativa (redireciona para `/login`)
3. **Rewrite de subdomínios**: `barbearia.rikoseo.com.br/contato` → `/site/barbearia/contato`

### Criptografia

- Tokens Google (access + refresh) são criptografados com **AES** antes de salvar no banco
- Módulo dedicado: `lib/crypto.ts`

---

## SEO Técnico Automático

### Schema Markup (JSON-LD)

O sistema gera automaticamente 5 tipos de Schema Markup:

1. **LocalBusiness** — Com mapeamento inteligente de categoria para tipo (ex: BARBEARIA → BarberShop, RESTAURANTE → Restaurant)
2. **Article** — Para artigos do blog com author, publisher, datePublished, wordCount
3. **FAQPage** — Para perguntas frequentes em artigos e landing pages
4. **BreadcrumbList** — Navegação estruturada
5. **WebSite** — Com SearchAction para busca no blog

### Sitemap e robots.txt

- **next-sitemap**: Gerado automaticamente no `postbuild`
- **Frequência**: Semanal
- **Exclusões**: `/painel/*`, `/onboarding/*`, `/login/*`, `/api/*`, `/_next/*`
- **robots.txt**: Allow `/` para todos, Disallow para áreas protegidas, Allow total para Googlebot

### Sitemap Dinâmico

- Arquivo `sitemap.ts` gera sitemap dinâmico com artigos e landing pages do banco

---

## Cron Jobs (Automações)

Configurados no `vercel.json` via Vercel Cron:

| Cron Job | Schedule | Função |
|----------|----------|--------|
| `/api/cron/relatorio` | `0 10 * * 1` (Seg 10h) | Gera relatório semanal para todos os negócios Pro+ |
| `/api/cron/sync-reviews` | `0 */6 * * *` (cada 6h) | Sincroniza avaliações do Google My Business |

---

## Subdomínios e Multi-tenancy

### Arquitetura Multi-tenant

Cada negócio cadastrado recebe um **subdomínio exclusivo**:

- **Produção**: `{slug}.rikoseo.com.br`
- **Dev/Local**: `{slug}.localhost:3000` ou `localhost:3000?subdomain={slug}`

### Fluxo de Resolução

```
Request: barbearia-joao.rikoseo.com.br/contato
    ↓ 
Middleware extrai subdomínio: "barbearia-joao"
    ↓
Rewrite: /site/barbearia-joao/contato
    ↓
Next.js renderiza a página do site do cliente
```

---

## Como Rodar o Projeto

### Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Conta Supabase (PostgreSQL)
- Chave Gemini API
- Credenciais Google OAuth

### Instalação

```bash
# 1. Clonar o repositório
git clone <repo-url> rikoseo
cd rikoseo

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com as credenciais

# 4. Rodar migrations
npx drizzle-kit push

# 5. Rodar em desenvolvimento
npm run dev
```

### Scripts disponíveis

```bash
npm run dev        # Servidor de desenvolvimento (localhost:3000)
npm run build      # Build de produção
npm run start      # Iniciar build de produção
npm run lint       # ESLint
```

---

## Variáveis de Ambiente

```env
# === Database ===
DATABASE_URL=postgresql://...

# === Auth ===
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# === Google OAuth ===
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# === Google Gemini ===
GEMINI_API_KEY=...

# === Pagamentos ===
ASAAS_API_KEY=...
ASAAS_ENVIRONMENT=sandbox  # ou production

# === Email ===
RESEND_API_KEY=...

# === Unsplash ===
UNSPLASH_ACCESS_KEY=...

# === Criptografia ===
ENCRYPTION_KEY=...

# === Site ===
SITE_URL=https://rikoseo.com.br
```

---

## Deploy e Infraestrutura

### Vercel

- **Framework**: Next.js (auto-detect)
- **Region**: US-East-1 (ou São Paulo se disponível)
- **Cron Jobs**: 2 configurados no `vercel.json`
- **Domínio**: `rikoseo.vercel.app` + DNS customizado `rikoseo.com.br`
- **Wildcard Subdomínios**: `*.rikoseo.com.br` → Vercel

### Supabase

- **PostgreSQL 15+** com Drizzle ORM
- **12 tabelas** + relações
- **Migrations** via `drizzle-kit`

---

## Fluxo de Uso do Cliente

### Dia 0: Onboarding

1. **Cadastro/Login** via Google OAuth
2. **Criação do Negócio**: Nome, categoria, cidade, endereço, telefone, website
3. **Definição do Subdomínio** (ex: `barbearia-joao`)
4. **Conexão com Google My Business** (OAuth — acesso ao perfil e reviews)
5. **Primeira Auditoria**: "Recalcular Score IA" → Score inicial + recomendações

### Rotina Semanal (15-20 min)

1. **Avaliações**: Filtrar por sentimento, responder via IA as neutras/negativas
2. **Posts GMB**: Gerar 1+ post semanal via IA (informativo, desconto ou evento)
3. **Blog** (Pro): Gerar 1 artigo SEO sobre tema relevante

### Rotina Mensal/Trimestral

1. **Analytics + Ranking**: Verificar crescimento de posição
2. **Relatório**: Gerar relatório gerencial para stakeholders
3. **Keywords**: Atualizar lista, remover tags mortas
4. **NAP Check**: Rodar auditoria para verificar consistência

---

## Roadmap Futuro

> Melhorias planejadas e possíveis evoluções:

- [ ] **DataForSEO**: Substituir Google Suggest por API com volume real, CPC e dificuldade
- [ ] **Múltiplos negócios** por conta (atualmente max 1)
- [ ] **App Mobile** (React Native / Expo)
- [ ] **Agente de Concorrentes**: Monitorar perfis GMB de concorrentes
- [ ] **A/B Testing** de postagens GMB
- [ ] **Integração com Meta Business** (Facebook + Instagram)
- [ ] **White Label**: Permitir que agências usem com marca própria
- [ ] **Dashboard de Agência**: Gerenciar múltiplos clientes
- [ ] **Chatbot WhatsApp**: Integração com API do WhatsApp Business
- [ ] **Notificações Push**: Alertas em tempo real de reviews negativos

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/                  # Páginas de login/cadastro
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Layout do painel (sidebar + topbar)
│   │   └── painel/
│   │       ├── page.tsx         # Dashboard principal
│   │       ├── analytics/       # Analytics completo
│   │       ├── avaliacoes/      # Gestão de reviews
│   │       ├── blog/            # Blog SEO
│   │       ├── cobranca/        # Checkout / Pagamento
│   │       ├── configuracoes/   # Settings do negócio
│   │       ├── nap/             # Verificador NAP
│   │       ├── palavras-chave/  # Keyword Research
│   │       ├── perfil-gmb/      # Perfil Google Meu Negócio
│   │       ├── postagens/       # Posts GMB
│   │       ├── ranking/         # Rank Tracking
│   │       ├── relatorios/      # Relatórios
│   │       └── site/            # Landing Pages
│   ├── api/
│   │   ├── auth/                # Better Auth routes
│   │   ├── cron/                # Cron jobs (relatório + sync reviews)
│   │   ├── negocios/            # API do negócio
│   │   └── webhooks/            # Webhooks (Asaas)
│   ├── blog/                    # Blog público
│   ├── onboarding/              # Fluxo de setup
│   ├── site/                    # Sites dos clientes (multi-tenant)
│   ├── page.tsx                 # Landing page marketing
│   └── sitemap.ts               # Sitemap dinâmico
├── components/
│   ├── dashboard/
│   │   ├── barra-lateral.tsx    # Sidebar do painel
│   │   ├── barra-superior.tsx   # Topbar com user info
│   │   └── grafico-evolucao.tsx # Gráfico Recharts
│   ├── feature-gate.tsx         # Bloqueio de features premium
│   └── paywall.tsx              # Tela de upgrade
├── db/
│   ├── index.ts                 # Conexão Drizzle
│   └── schema/                  # 12 arquivos de schema
│       ├── artigo.ts
│       ├── auth.ts
│       ├── avaliacao.ts
│       ├── execucao-agente.ts
│       ├── historico-ranking.ts
│       ├── index.ts
│       ├── landing-page.ts
│       ├── negocio.ts
│       ├── palavras-chave-negocio.ts
│       ├── pontuacao-presenca.ts
│       ├── postagem.ts
│       └── verificacoes-nap.ts
├── emails/                      # Templates React Email
├── lib/
│   ├── agents/                  # 9 Agentes de IA
│   ├── ai/                      # Gerador de site / prompts
│   ├── asaas/                   # Cliente Asaas (pagamentos)
│   ├── email/                   # Serviço de email
│   ├── google/                  # Google My Business + Search Console
│   ├── google-api/              # Cliente GMB API
│   ├── keywords/                # Google Suggest
│   ├── seo/                     # Schema Markup generators
│   ├── auth.ts                  # Configuração Better Auth
│   ├── auth-client.ts           # Cliente auth (client-side)
│   ├── crypto.ts                # Criptografia AES
│   ├── planos.ts                # Controle de acesso por plano
│   ├── pontuacao.ts             # Cálculo de score
│   ├── resend.ts                # Cliente Resend
│   ├── seo.ts                   # Utilitários SEO
│   ├── unsplash.ts              # Cliente Unsplash
│   └── utils.ts                 # Utilitários gerais
├── types/
│   └── index.ts                 # Tipos globais TypeScript
└── middleware.ts                # Subdomínios + Auth
```

---

## Contato & Metadados

| Campo | Valor |
|-------|-------|
| **Projeto** | RikoSEO (RikoGMB) |
| **Versão** | v2.0 |
| **Package name** | `localseo` |
| **Início do Desenvolvimento** | 2026 |
| **Última Atualização** | Abril 2026 |
| **Repositório** | Git local |
| **Deploy** | Vercel |
| **Banco** | Supabase (PostgreSQL) |

---

> 📌 **Este documento é uma referência técnica interna. Mantenha-o atualizado conforme novas funcionalidades forem adicionadas ao projeto.**


---\n## Hist�rico de Atualiza��es de Produ��o

**Relacionado a:** [[RikoGMB - Documentação Completa do Projeto]]

# Log de Migração e Purificação do RikoSEO

**Data de Conclusão:** 21 de Abril de 2026
**Objetivo Principal:** Migração para produção real (Netlify) e eliminação completa de dados simulados (mocks).

---

## 1. Contexto e Problemas Encontrados

O painel administrativo do RikoSEO estava previamente configurado para exibir dados de demonstração ("mock") e estimativas de ranking (via fallbacks) quando chaves de API (como a do Gemini ou do Google) não estavam conectadas ou quando o código rodava em ambiente local. Isso causou confusão quando o sistema foi movido para a **Netlify**, pois o frontend apresentava números e respostas que não refletiam o banco de dados real.

### Os problemas corrigidos:
- **Build na Netlify Falhando:** A Netlify tentava construir páginas estáticas ou API Routes (ex: `api/cron/sync-reviews`) em que a variável `DATABASE_URL` não existia no escopo de build.
- **Rastreadores Injetando Mocks:** O sistema gerava "posições" de keywords randômicas (salvas no banco como `ESTIMATIVA`) para preencher a UI de ranking vazio.
- **Respostas de IA Fictícias:** Agentes de Reviews e Posts retornavam textos _hardcoded_ (ex: "Lamentamos sua experiência") se a chave da API do Gemini estivesse ausente, em vez de exigir que o usuário configurasse a integração final.

---

## 2. Ações Tomadas e Arquivos Modificados

### A. Correções de Build e Variáveis de Ambiente (Netlify)
- Identificamos o "crash" no build da Netlify por causa de acesso prematuro a Hooks (`useContext`) em **Server Components** na página do Analytics. Esse problema foi monitorado e as variáveis globais (`DATABASE_URL`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_URL`) foram configuradas devidamente.

### B. O Expurgo de Mocks ("Operação Limpeza")
Garantimos que, de agora em diante, o sistema retorne `0` ou `falha` (exigindo ação do usuário) em vez de dados fictícios em toda a extensão do app.

Modificações nos arquivos:
- **`src/lib/agents/rastreador-ranking.ts`**
  - **O que mudou:** Removida a antiga função `simularRanking`. Se o módulo do _Search Console_ não trouxer as posições reais, o sistema retornará dados nulos, evitando o preenchimento artificial.
- **`src/app/(dashboard)/painel/palavras-chave/actions.ts`**
  - **O que mudou:** O array engessado de sugestões de IA foi trocado por um "Exception Route". Sem `GEMINI_API_KEY`, a Action de _Gerar Sugestões_ falha, sinalizando o erro de forma apropriada na UI.
- **`src/lib/agents/agente-posts.ts`** e **`src/lib/agents/agente-avaliacoes.ts`**
  - **O que mudou:** Removidas as funções de timeout falso (`setTimeout(..., 2000)`). A automação para elaborar respostas de Reviews GMB e novos Posts agora apita erro de "API Key Ausente" parando o fluxo em vez de imitar sucesso.
- **`src/lib/unsplash.ts`**
  - **O que mudou:** Foi mantido um _fallback visual_ puramente para não quebrar templates das publicações, o que é o procedimento correto do ponto de vista de UI (placeholder), mas não interage com o banco de forma nociva. 

### C. Limpeza Direta do Banco de Dados de Produção
Para evitar que dados "sujos" do passado permanecessem na tela:
- Editamos e executamos um script com Node 20 nativo: `node --env-file=.env.local --import tsx src/db/clearMocks.ts`
- **Impacto:** O script deletou todas as entradas da tabela `historicoRanking` que continham a tag `"ESTIMATIVA"` vinda dos testes. 

---

## 3. Push para Produção
Todos os expurgos acima foram unificados no repositório com o seguinte commit listado:
```bash
git add .
git commit -m "chore: remove todos os dados mock e placeholders de fallback em favor de relatorios de falha (producao pura)"
git push
```

---

## 4. Próximos Passos (Para o Operador do Sistema)

1. **Conta de Integrador (Google Meu Negócio):** 
   - Note que na aba "Ranking" ou "Avaliações", os contadores ou tabelas podem aparecer vazios. Isso agora é o **comportamento correto** se o usuário final ainda não vinculou suas propriedades de GMB / Search Console.
   
2. **Setup do Gemini:**
   - Adicionar a `GEMINI_API_KEY` na Netlify é vital para o retorno das funções do **Agente de Posts, Sugestões de SEO e Avaliações Automáticas**. 

3. **Deploy Netlify:**
   - Aguarde o término do build gerado pelo nosso *push*. Qualquer erro futuro de build agora estará restrito à compilação limpa sem os remendos antigos.

### D. Limpeza Final de Avalia��es Seed
Foi constado que 2 avalia��es da interface (Jo�o Silva e Maria Souza) haviam sido inseridas DIRETAMENTE no banco de dados na fase inicial de testes pelo script seed.ts. Esses registros foram exclu�dos permanentemente utilizando um script Drizzle para limpar as tabelas.


