
# Siding Depot — Documento de Telas e Módulos (MVP)
**Stack:** Next.js 15 (App Router) + React 19 + Tailwind CSS + ESLint + TypeScript/Node types  
**Objetivo:** definir o que existe em cada tela e em cada módulo antes da implementação visual.

## 1. Norte do produto

Este MVP deve organizar a operação da Siding Depot sem repetir o erro da planilha: misturar vendas, execução, documentos e pendências no mesmo lugar.

Regra principal do domínio:

- **Serviços não são etapas universais.**
- Um job pode ter **1 ou vários serviços contratados**.
- Exemplos:
  - só Gutters
  - Deck + Siding
  - Windows + Painting
- Portanto, o sistema deve ser modelado como:
  - **Job**
  - **Serviços contratados dentro do job**
  - **Execução operacional por serviço quando aplicável**

## 2. Perfis e onde cada um usa o sistema

### Admin / Office
Usa principalmente **WEB**.
Precisa de telas ricas em tabela, filtros, detalhe, documentos e controle operacional.

### Parceiros / Crews / Instaladores
Usam principalmente **MOBILE WEB**.
Precisam de telas rápidas: jobs atribuídos, instruções, fotos, observações, conclusão da própria parte.

### Vendedores
Usam principalmente **MOBILE WEB**.
Precisam de acompanhamento dos jobs vendidos, contexto do cliente e documentos comerciais permitidos.

### Clientes
Usam **portal web responsivo**.
Precisam apenas de aprovações, cores, documentos e certificado final.  
**Não podem ver agenda interna.**

## 3. Estrutura macro da aplicação

### Áreas do sistema

1. **Área Admin**
2. **Área Field / Mobile**
3. **Portal do Cliente**
4. **Autenticação**
5. **APIs / ações de servidor**
6. **Componentes compartilhados**

## 4. Mapa de telas por área

## 4.1. Autenticação

### Tela: Login
**Objetivo:** entrada única do sistema.

**Deve ter:**
- logo / nome da empresa
- campo e-mail
- campo senha
- botão entrar
- link esqueci minha senha
- mensagem de erro
- loading state

**Observações de UX:**
- tela limpa
- foco total na ação principal
- sem distrações

---

### Tela: Recuperar senha
**Objetivo:** solicitar redefinição de senha.

**Deve ter:**
- campo e-mail
- botão enviar link
- feedback de sucesso
- link voltar ao login

---

### Tela: Redefinir senha
**Objetivo:** cadastrar nova senha a partir de token.

**Deve ter:**
- nova senha
- confirmar senha
- validação mínima
- botão salvar

## 4.2. Área Admin (WEB)

### Tela: Dashboard principal
**Objetivo:** visão geral operacional do escritório.

**Blocos da tela:**
- cards de resumo
  - jobs ativos
  - jobs aguardando pendência
  - jobs prontos para validação
  - change orders pendentes
  - certificados pendentes
- bloco de vendas
  - meta do mês
  - vendido no mês
  - faltante para meta
  - ticket médio
- lista de alertas
  - blocker crítico
  - job sem crew atribuída
  - aprovação pendente
- tabela de próximos jobs / atenção do dia
- atalhos rápidos
  - criar job
  - abrir agenda operacional
  - abrir documentos
  - abrir pendências

**Componentes importantes:**
- filtros por período
- filtros por vendedor
- filtro por status
- cards clicáveis
- tabela compacta e clara

---

### Tela: Lista de Jobs
**Objetivo:** tela central de consulta e gestão.

**Deve ter:**
- busca por nome, endereço, número do job
- filtros:
  - status
  - vendedor
  - crew
  - serviço
  - blocker
  - período
- tabela com colunas:
  - número / ID
  - cliente
  - endereço
  - serviços
  - vendedor
  - status geral
  - blockers
  - última atualização
  - ações
- paginação
- ação de criar job

**Ações por linha:**
- ver detalhe
- editar
- abrir documentos
- registrar pendência
- reatribuir crew

---

### Tela: Criar / Editar Job
**Objetivo:** cadastro principal do job.

**Seções da tela:**
1. dados do cliente
2. dados do job
3. endereço da obra
4. vendedor responsável
5. serviços contratados
6. observações internas
7. anexos iniciais

**Campos sugeridos:**
- nome do cliente
- telefone
- e-mail
- endereço completo
- sales person
- data de entrada
- origem / referência
- notas internas
- checklist básico

**Na seção de serviços contratados:**
- seleção múltipla de serviços:
  - Siding
  - Painting
  - Gutters
  - Roofing
  - Windows
  - Doors
  - Deck
  - outros, se necessário
- para cada serviço:
  - status do serviço
  - crew responsável
  - observação operacional
  - duração estimada
  - datas relevantes

**Importante:**
essa tela não deve forçar um pipeline fixo.  
Ela deve permitir compor o job pelos serviços contratados.

---

### Tela: Detalhe do Job
**Objetivo:** hub central do job no admin.

**Blocos da tela:**
- cabeçalho com dados principais
- chips com serviços contratados
- status geral do job
- timeline de eventos
- quadro de blockers e pendências
- quadro de crews atribuídas
- quadro de documentos
- quadro de approvals / change orders
- notas internas
- fotos / anexos
- ações rápidas

**Ações rápidas:**
- editar job
- adicionar serviço
- alterar crew
- registrar blocker
- anexar documento
- gerar change order
- liberar documento para cliente
- marcar validação de conclusão

---

### Tela: Gestão de Serviços do Job
**Objetivo:** administrar os serviços contratados dentro de um job.

**Deve ter:**
- cards ou accordion por serviço contratado
- em cada card:
  - nome do serviço
  - crew atual
  - status do serviço
  - estimativa
  - datas relevantes
  - blockers específicos
  - notas
  - documentos vinculados
  - fotos vinculadas

**Ações no card do serviço:**
- editar dados do serviço
- reatribuir crew
- sinalizar pronto para validação
- encerrar serviço
- adicionar blocker
- adicionar nota

---

### Tela: Agenda Operacional / Scheduling Assistido
**Objetivo:** visão operacional para o escritório reorganizar execução.

**Deve ter:**
- visualização por dia / semana
- agrupamento por crew
- cards de jobs alocados
- marcador visual de conflito
- marcador visual de blocker
- ação de mover / replanejar
- painel lateral com detalhe do item

**Não deve tentar ser “mágica” demais no MVP.**
A agenda deve ajudar o admin a:
- enxergar conflito
- rearranjar
- validar impacto

**Recursos da tela:**
- filtros por serviço
- filtros por crew
- filtros por status
- toggle para mostrar blockers
- botão “sugerir ajuste” no futuro, mas simples no MVP

---

### Tela: Pendências e Blockers
**Objetivo:** centralizar impedimentos operacionais.

**Deve ter:**
- lista filtrável por tipo de blocker
- colunas:
  - job
  - serviço afetado
  - tipo
  - descrição
  - responsável
  - data de abertura
  - prioridade
  - status
- filtros:
  - open / resolved
  - financing
  - permit
  - windows/doors
  - weather
  - HOA
  - electrician
  - material
- ação rápida:
  - resolver
  - comentar
  - alterar prioridade
  - vincular evidência

---

### Tela: Crews / Parceiros
**Objetivo:** gestão de equipes e parceiros.

**Deve ter:**
- lista de crews
- tipo/especialidade
- quantidade de equipes
- responsáveis
- status ativo/inativo
- jobs atuais
- capacidade estimada

**Ações:**
- criar crew
- editar crew
- inativar crew
- reatribuir jobs futuros
- ver histórico operacional

---

### Tela: Detalhe da Crew
**Objetivo:** ver capacidade, jobs e contexto da equipe.

**Blocos:**
- dados da crew
- especialidades
- membros ou referência operacional
- jobs atuais
- próximos jobs
- histórico
- observações
- documentos padrão

---

### Tela: Documentos
**Objetivo:** central documental do sistema.

**Categorias:**
- job packet
- contratos
- documentos liberados ao cliente
- completion certificate
- anexos internos
- imagens
- PDFs gerados

**Na lista:**
- nome
- job
- tipo
- visibilidade
- data
- status
- ações

**Ações:**
- upload
- gerar PDF
- baixar
- liberar ao cliente
- ocultar
- substituir versão

---

### Tela: Change Orders / Aprovações Extras
**Objetivo:** controlar serviços adicionais e aprovações do cliente.

**Deve ter:**
- lista de change orders
- status:
  - draft
  - sent
  - approved
  - declined
- job vinculado
- serviço vinculado
- valor
- descrição
- data de envio
- data de resposta

**Na criação/edição:**
- descrição do extra
- valor
- anexos / fotos
- mensagem para cliente
- ação de enviar para aprovação

---

### Tela: Sales Dashboard
**Objetivo:** painel comercial da operação.

**KPIs principais:**
- sales goal
- sold so far
- remaining to goal
- total de jobs vendidos
- average ticket
- performance por vendedor

**Elementos da tela:**
- cards KPI
- gráfico simples por período
- tabela por vendedor
- filtros por mês / período
- bloco “mensagem semanal pronta”

**Bloco mensagem semanal:**
- resumo formatado para copiar
- números do período
- performance por vendedor

---

### Tela: Usuários e Permissões
**Objetivo:** gestão de acesso.

**Deve ter:**
- lista de usuários
- papel:
  - admin
  - office
  - salesperson
  - partner
  - customer
- status
- último acesso
- ações:
  - convidar
  - editar acesso
  - desativar
  - resetar senha

---

### Tela: Configurações
**Objetivo:** central de preferências do sistema.

**Seções:**
- serviços disponíveis
- tipos de blocker
- status configuráveis
- templates de documentos
- branding
- metas de vendas
- preferências operacionais

## 4.3. Área Field / Mobile Web

### Tela: Home Mobile
**Objetivo:** tela inicial rápida para parceiro ou vendedor.

**Deve ter:**
- saudação curta
- cards de resumo:
  - jobs atribuídos hoje
  - jobs em andamento
  - pendências abertas
- lista curta de próximos jobs
- atalhos:
  - meus jobs
  - fotos
  - observações
  - documentos

---

### Tela: Meus Jobs
**Objetivo:** listar somente jobs atribuídos ao usuário logado.

**Deve ter:**
- busca
- filtros por status
- cards simples
- cada card com:
  - cliente
  - endereço
  - serviço
  - status
  - data relevante
  - badge de blocker, se houver

---

### Tela: Detalhe do Meu Job
**Objetivo:** execução rápida em campo.

**Deve ter:**
- cabeçalho com cliente e endereço
- serviço atribuído ao usuário
- instruções de trabalho
- contatos essenciais
- notas do escritório liberadas
- fotos do job
- documentos permitidos
- bloco de ações rápidas

**Ações rápidas:**
- enviar foto
- adicionar observação
- sinalizar blocker
- marcar minha parte como concluída

**Importante:**
não mostrar valor financeiro do cliente.

---

### Tela: Enviar Fotos
**Objetivo:** registro visual da execução.

**Deve ter:**
- upload por câmera/galeria
- pré-visualização
- legenda opcional
- vínculo com job
- vínculo com serviço
- botão enviar

---

### Tela: Observações de Campo
**Objetivo:** registrar observações rápidas.

**Deve ter:**
- textarea
- marcação de prioridade
- vínculo com job/serviço
- histórico de observações

---

### Tela: Sinalizar Blocker
**Objetivo:** avisar impedimento em campo.

**Deve ter:**
- tipo de blocker
- descrição
- upload de imagem opcional
- prioridade
- botão enviar

---

### Tela: Documentos do Job
**Objetivo:** acesso rápido aos documentos liberados para a crew.

**Deve ter:**
- lista de PDFs e anexos
- botão visualizar
- botão baixar
- categorização simples

**Importante:**
apenas documentos permitidos.  
Sem valores financeiros.

## 4.4. Área de Vendedores (mobile-first)

### Tela: Jobs Vendidos por Mim
**Objetivo:** o vendedor acompanhar apenas o que fechou.

**Deve ter:**
- lista de jobs
- status geral
- serviços contratados
- documentos comerciais disponíveis
- andamento liberado
- sem agenda interna completa

---

### Tela: Detalhe Comercial do Job
**Objetivo:** contexto comercial do job para o vendedor.

**Deve ter:**
- cliente
- endereço
- serviços contratados
- status comercial
- documentos assinados
- pendências relevantes para contato
- ações permitidas

## 4.5. Portal do Cliente

### Tela: Home do Cliente
**Objetivo:** área privada simples do cliente.

**Deve ter:**
- saudação
- job vinculado
- cards:
  - documentos disponíveis
  - change orders pendentes
  - certificado pendente
  - cores de pintura
- mensagens simples do escritório, se liberadas

**Importante:**
não mostrar agenda das crews.

---

### Tela: Documentos do Cliente
**Objetivo:** acessar documentos liberados.

**Deve ter:**
- lista de documentos
- tipo
- data
- ação de abrir / baixar

---

### Tela: Aprovar Serviço Adicional
**Objetivo:** cliente aprovar ou recusar extra.

**Deve ter:**
- descrição do serviço adicional
- valor
- imagens / evidências, se houver
- botão aprovar
- botão recusar
- confirmação final

---

### Tela: Informar Cores de Pintura
**Objetivo:** cliente registrar cores.

**Deve ter:**
- campos para cor principal
- acabamento / trim
- observações
- botão salvar

---

### Tela: Assinar Certificado de Conclusão
**Objetivo:** finalizar aceite do cliente.

**Deve ter:**
- resumo do documento
- visualização do certificado
- campo de assinatura
- botão assinar
- confirmação

## 5. Módulos de sistema

## Módulo 1 — Fundação e Layout
**Inclui:**
- setup do projeto
- layout base
- sidebar/header
- tema
- tokens visuais
- componentes base
- estados de loading, empty e error

## Módulo 2 — Autenticação
**Inclui:**
- login
- reset
- proteção de rotas
- redirecionamento por papel

## Módulo 3 — Jobs
**Inclui:**
- lista
- criação
- edição
- detalhe

## Módulo 4 — Serviços do Job
**Inclui:**
- composição de serviços
- cards por serviço
- edição por serviço
- status por serviço

## Módulo 5 — Crews e Atribuições
**Inclui:**
- cadastro de crews
- detalhe da crew
- associação de serviço a crew
- reatribuição

## Módulo 6 — Pendências e Blockers
**Inclui:**
- abertura
- listagem
- prioridade
- resolução
- evidência

## Módulo 7 — Scheduling Assistido
**Inclui:**
- visão por crew
- visão por período
- conflito
- rearranjo manual assistido

## Módulo 8 — Documentos
**Inclui:**
- listagem
- upload
- categorização
- geração de PDF no futuro
- liberação por visibilidade

## Módulo 9 — Change Orders e Aprovações
**Inclui:**
- cadastro de extra
- envio ao cliente
- aprovação / recusa
- histórico

## Módulo 10 — Sales Dashboard
**Inclui:**
- KPIs
- tabela por vendedor
- resumo semanal

## Módulo 11 — Área Mobile Field
**Inclui:**
- meus jobs
- detalhe
- foto
- observação
- blocker
- documentos permitidos

## Módulo 12 — Portal do Cliente
**Inclui:**
- home
- documentos
- aprovação de extra
- cores
- certificado

## 6. Navegação sugerida (App Router)

### Rotas públicas
- `/login`
- `/forgot-password`
- `/reset-password`

### Área Admin
- `/admin`
- `/admin/jobs`
- `/admin/jobs/new`
- `/admin/jobs/[jobId]`
- `/admin/jobs/[jobId]/edit`
- `/admin/jobs/[jobId]/services`
- `/admin/scheduling`
- `/admin/blockers`
- `/admin/crews`
- `/admin/crews/[crewId]`
- `/admin/documents`
- `/admin/change-orders`
- `/admin/sales`
- `/admin/users`
- `/admin/settings`

### Área Field
- `/field`
- `/field/jobs`
- `/field/jobs/[jobId]`
- `/field/jobs/[jobId]/photos`
- `/field/jobs/[jobId]/notes`
- `/field/jobs/[jobId]/blocker`
- `/field/jobs/[jobId]/documents`

### Área Sales
- `/sales`
- `/sales/jobs`
- `/sales/jobs/[jobId]`

### Portal Cliente
- `/portal`
- `/portal/documents`
- `/portal/change-orders/[id]`
- `/portal/paint-colors`
- `/portal/completion-certificate`

## 7. Componentes compartilhados que valem criar cedo

- AppShell
- Sidebar
- Topbar
- PageHeader
- SectionCard
- KPIBox
- Badge de status
- Badge de blocker
- DataTable
- EmptyState
- LoadingState
- ErrorState
- SearchInput
- FilterBar
- ServiceChip
- Timeline
- DocumentList
- PhotoUploader
- ConfirmDialog

## 8. Design system inicial

**Cores**
- Verde principal: `#b2d234`
- Branco: `#FFFFFF`
- Preto: `#000000`

**Tom visual**
- limpo
- profissional
- operacional
- sem excesso de ornamento

**Padrões**
- cards simples
- tabelas legíveis
- filtros em linha
- mobile com botões grandes
- header fixo quando fizer sentido
- foco total em clareza operacional

## 9. Ordem certa para desenhar as telas

### Fase 1 — base
1. login
2. dashboard admin
3. lista de jobs
4. detalhe do job

### Fase 2 — operação
5. criar/editar job
6. gestão de serviços do job
7. blockers
8. crews
9. scheduling

### Fase 3 — documentos e comercial
10. documentos
11. change orders
12. sales dashboard

### Fase 4 — mobile e cliente
13. home mobile
14. meus jobs
15. detalhe do meu job
16. portal cliente
17. aprovação de extra
18. certificado

## 10. Decisão de UX que eu recomendo

Antes de implementar lógica pesada:
- suba as telas com dados mockados
- feche layout e navegação
- valide nome das seções
- valide quais ações aparecem para cada papel
- só depois conecte dados reais

Esse é o caminho certo porque hoje seu maior risco não é banco.  
É construir tela errada para fluxo certo.

## 11. Estrutura sugerida de pastas

```txt
src/
  app/
    (public)/
      login/
      forgot-password/
      reset-password/
    (admin)/
      admin/
        page.tsx
        jobs/
        scheduling/
        blockers/
        crews/
        documents/
        change-orders/
        sales/
        users/
        settings/
    (field)/
      field/
        page.tsx
        jobs/
    (sales)/
      sales/
        page.tsx
        jobs/
    (portal)/
      portal/
        page.tsx
        documents/
        change-orders/
        paint-colors/
        completion-certificate/
  components/
    ui/
    shared/
    layout/
  features/
    auth/
    jobs/
    services/
    crews/
    blockers/
    scheduling/
    documents/
    change-orders/
    sales/
    portal/
  lib/
  types/
```

## 12. Conclusão prática

Se o foco agora é **criar as telas primeiro**, eu começaria assim:

1. Auth
2. Admin dashboard
3. Jobs list
4. Job detail
5. Job form
6. Services inside job
7. Blockers
8. Crews
9. Scheduling
10. Documents
11. Change orders
12. Sales dashboard
13. Field mobile
14. Customer portal

Essa ordem te dá:
- estrutura
- navegação
- validação de fluxo
- visão clara do que falta
- menos retrabalho depois
