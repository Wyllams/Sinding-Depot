# SIDING DEPOT - Status do MVP (Mapeamento de Telas e Funcionalidades)

Mapeamento completo do projeto, organizando o que já foi finalizado e o que ainda está pendente baseado no documento original do MVP e nas nossas últimas implementações.

### 🔐 1. Autenticação (Módulo 2)
- [x] Tela: Login (Visual Premium, Tema Escuro, Split-screen)
- [x] Funcionalidade: Redirecionamento correto por papel de usuário (Login -> Dashboard)
- [x] Funcionalidade: Suporte a submissão com tecla "Enter"
- [x] Funcionalidade: Mecanismo seguro de Logout
- [ ] Tela: Recuperar senha (Esqueci a senha)
- [ ] Tela: Redefinir senha (Nova senha via token)

### 💼 2. Área Admin & Backoffice (Módulo 3 a 10)
- [x] Tela: Configurações Gerais - Permissões e Acessos
- [x] Funcionalidade: Criação de Roles (Matriz de Permissões) com navegação fluida
- [x] Funcionalidade: Modal "Novo Serviço" com filtro dinâmico de parceiro/disciplina e layout otimizado
- [ ] Tela: Dashboard Principal (Cards KPI, Vendas, Alertas críticos)
- [ ] Tela: Lista de Jobs (Tabela principal com filtros)
- [ ] Tela: Detalhe do Job (Hub focal com todas as informações e histórico do projeto)
- [ ] Tela: Gestão de Serviços do Job (Status, Crews e Timeline)
- [ ] Tela: Agenda Operacional (Schedule Assistido Mobile/Web)
- [ ] Tela: Pendências e Blockers (Kanban ou Lista de resoluções)
- [ ] Tela: Crews e Parceiros (Listagem de Parceiros Ativos)
- [ ] Tela: Detalhe da Crew (Capacidade, Histórico)
- [ ] Tela: Central de Documentos (Visão Admins)
- [ ] Tela: Change Orders / Aprovações Extras (Controle Administrativo)
- [ ] Tela: Sales Dashboard (Acompanhamento e Metas do mês)
- [ ] Tela: Usuários e Permissões (Listagem/Convite de Usuários do Sistema)
- [ ] Tela: Service Log / Warranty Calls (Central de chamados de manutenção e reparo)

### 📱 3. Área Field / Parceiros (Módulo 11 - Mobile Web)
- [ ] Tela: Home Mobile (Saudação e Atalhos Rápidos)
- [ ] Tela: Meus Jobs (Jobs Atribuídos à Crew)
- [ ] Tela: Detalhe do Meu Job (Instruções e Notas Operacionais Ocultando Financeiro)
- [ ] Tela: Enviar Fotos (Registro visual de etapa)
- [ ] Tela: Observações de Campo
- [ ] Tela: Sinalizar Blocker (Registro de Impedimento)
- [ ] Tela: Documentos do Job (Acesso somentes a arquivos permitidos para Crew)

### 🤝 4. Portal do Cliente (Módulos 8 & 12)
- [x] Autenticação Privada: Ocultando detalhes internos e agenda financeira (Restrição RLS)
- [x] Funcionalidade: History Tracking (Rastreamento de aprovações com reatividade)
- [x] Tela: Documentos Seguros (Acesso a anexos comerciais via Customer Portal)
- [x] Tela: Assinatura de Contratos (Página focada no cliente com layout responsivo)
- [ ] Tela: Home principal do Portal do Cliente
- [ ] Tela: Painel de Aprovar Serviços Adicionais (Change Orders / Extras)
- [ ] Tela: Informar Cores e Detalhes de Acabamento
- [ ] Tela: Assinar Certificado Final de Conclusão / Aceite

### 📈 5. Área de Vendedores (Módulo 6 - Mobile First)
- [x] Tela: Navegação Mobile Principal (Vendedores)
- [x] Funcionalidade: Contextos / Providers de dados com restrição exclusivas a vendas (Esconde operações sigilosas)
- [x] Tela: Jobs Vendidos por Mim / Painel do Vendedor
- [ ] Tela: Detalhe Comercial do Job (Status estrito de venda)

### 🛠️ 6. Infraestrutura, Banco de Dados e UX Base
- [x] Layout Base: Atualização e adoção do novo Favicon arredondado (Premium)
- [x] Banco de dados: Setup RLS (Row Level Security) aplicado para isolamento de dados do cliente
- [x] Banco de dados: Migrações SQL e Schema de pagamentos `project_payment_milestones`
- [x] Infraestrutura: Correções do deploy na Vercel e middlewares corrigidos
- [x] Proteção: Guards / Middleware de rota implementados globalmente

---

## 🛡️ Regras de Acesso e Perfis de Usuário (Especificação de Permissões)

Esta seção define o escopo exato de visualização e manipulação de cada papel (Role) dentro do sistema Siding Depot.

### 👑 1. Administrador (ADM)
- **Acesso Global:** Tem acesso a TODOS os módulos, projetos, ordens de alteração, configurações, tabelas de preço, equipes e faturamentos do sistema sem restrições.

### 👔 2. Vendedor (Salesperson)
- **Dashboard Pessoal:** Dentro do Dashboard, tem acesso a informações, KPIs e resultados referentes *apenas* às suas próprias vendas.
- **Projetos (Jobs):** Acesso restrito aos projetos que foram atribuídos a ele / vendidos por ele.
- **Ordens de Alteração (Change Orders):** Acesso somente às ordens de alteração referentes aos seus projetos.
- **Relatórios:** Visualização de relatórios comerciais e operacionais estritos às suas métricas e clientes.

### 👷‍♂️ 3. Instalador / Parceiro (Crew)
*Regra principal: bloqueio absoluto a valores financeiros e agendas de terceiros.*
- **Calendário / Agenda:** Acesso *apenas* ao seu próprio calendário (e da sua 2ª equipe, caso tenha mais de uma subordinada).
- **Acesso a Projetos:** Podem abrir os projetos aos quais estão designados para ver informações do cliente (nome, endereço) e acessar o Contrato Assinado (MUITO IMPORTANTE: o contrato gerado para a Crew é uma versão "limpa", que não exibe nenhum valor financeiro).
- **Ordens de Alteração (Aprovadas):** Acesso às ordens de alteração aprovadas do seu projeto, para entenderem escopos extras (novamente, **sem exibir preços**).
- **Ações dentro do Projeto:**
  - Campo específico onde podem *solicitar mais material extra*.
  - Campo específico onde podem *solicitar adicionais* diretamente ao Vendedor responsável.
- **Certificado de Conclusão (COC / Completion Certificate):**
  - Acesso ao COC assinado eletronicamente pelo cliente.
  - Caso o cliente não tenha assinado remotamente, o instalador pode abrir o documento no seu próprio telefone para coletar a assinatura do cliente em campo.
  - **Restrição Crítica (Isolamento por Disciplina):** O instalador SÓ tem acesso ao COC do seu próprio serviço.
    - *Ex:* Instalador de Siding → Vê apenas o COC de Siding.
    - *Ex:* Pintor → Vê apenas o COC de Pintura.
    - *Ex:* Empreiteiro de Janelas → Vê o COC de depósito de janelas e de instalação de janelas.

### 👤 4. Cliente (Customer)
- **Portal Isolado:** Acesso externo, somente àquilo que lhe diz respeito (Contratos, Uploads de Documentos, Certificados e Change Orders pedindo sua aprovação).
- Não tem visibilidade alguma sobre a estrutura interna, faturamento corporativo ou cronograma das Crews.

---

## 🏗️ Requisitos da Tela de Projetos (Lista de Jobs e Detalhes)
Com base nas análises de interface (Vídeos S01 e PROJECTS - JOB DETAILS), a Listagem e o Detalhe de projetos terão as seguintes configurações:

**1. Lista de Jobs - Filtros e Pesquisa:**
- Barra de busca dinâmica (Search Bar) para nome do cliente / projeto.
- Filtro de Status (Ativo, Planejamento, Bloqueado). Apenas status relevantes para vendas serão listados ("Pending" ou "Not Ready").
- Filtro de Serviços (Siding, Pintura, Portas/Janelas, Calhas, Roofing).
- Filtro de Data (Date Range).

**2. Colunas da Tabela:**
- `SP` (Salesperson - Ícone com as iniciais e core categorizada do Google Calendar).
- `Client` (Nome do cliente).
- `Services` (Serviços contratados no formato "pills"/tags).
- `Gating / Operational Status` (Chip de status operacional como Weather, Permit, HOA).
- `Status` (O status macro do projeto: Active, Blocked, Planning com codificação de cores - Verde, Amarelo, Vermelho).

**3. Categorização de Cores dos Vendedores (SP):**
*Espelhado do Google Calendar:*
- **🟢 Matheus (Matt):** Cor Verde
- **🔴 Armando:** Cor Vermelha
- **🟣 Ruby:** Cor Roxa

**4. Detalhes do Job (Internal View):**
Ao clicar num projeto (`Client`), a página de detalhes deve ocultar elementos redundantes e agrupar as informações críticas do escritório:
- **Remoção de 'Job Timeline':** A barra infinita e confusa da esquerda ("Job Timeline") mostrada no template antigo **NÃO existirá**. No lugar dela, haverá a listagem horizontal das **Change Orders** referentes a essa obra.
- **Ações Rápidas Enxutas:** Serão apenas as estritamente necessárias (Ex: Schedule Inspection, Create Daily Log, View Map, Message Crew). Algumas, como 'Request Quote', serão ocultadas.
- **Painel de Parceiros Atribuídos:** Exibirá apenas os quadros (cards) referentes às disciplinas *efetivamente contratadas* para este projeto e a respectiva Crew alocada (Siding Crew, Paint Crew, etc). Outros serviços não contratados não ocuparão espaço.
- **Central Reestruturada de Documentos (Document Vault do Job):**
  - Existirão 3 blocos separados e cruciais para upload e organização verticalizados de forma intuitiva:
    - **1)** `Material Orders / Dumpster Receipt` (Notas fiscais da caçamba e pedidos extras).
    - **2)** `COC - Certificate of Completion` (Área dedicada só aos termos de entrega assinados).
    - **3)** `Pictures / Videos` (Área interativa para despejar mídias de medição, antes/depois).
  - O e-mail automático enviado por parceiros (ex: Home Depot), que vem com PDF anexado, **não** entra por parsing mágico agora; o próprio Office vai descarregar (`Download`) de lá e anexar nesse card de `Material Orders`.

---

## 🏗️ Requisitos da Tela de Crews & Partners (Diretório)

Com base na análise de interface (Vídeo SERVICES - CREWS.mp4):

**1. Layout e Funcionalidade Base:**
- Design Card-Based, sem formato de tabela tabular chata.
- Agrupamento lógico por fase/disciplina (Siding -> Pintura -> Portas/Janelas -> Calhas -> Roofing).

**2. Estrutura do Card da Equipe:**
- Nome da Crew, Status Visual (Available, Booked Out).
- Pílulas (Pills) com as tags autênticas (ex: Custom Paint, Spray, Vinyl Siding).
- Barra visual (% Busy) da capacidade ocupada.
- Calendário compacto horizontal (M T W T F S S).
- Avaliação (Estrelas) e Botão "Assign Job" em destaque absoluto.

**3. Modal 'Assign Job':**
- Campo 'Select Project' com auto-complete rápido.
- Select Start Date e End Date.
- Pre-selecionado a especialidade do Crew.

---

## 🏗️ Requisitos do Módulo "Service Calls" (Reformulação da página 'Issues')

Com base na análise de restruturação (Vídeo RENOMEAR ISSUES - SERVICES):

A página 'Issues' receberá o título permanente de `Services` e se transformará em um painel técnico de suporte/manutenção pós-venda.

**1. Tabela Principal (Lista de Chamados / Serviços)**
- Tabela limpa: `ID` (#0922), `Title / Detalhes do problema`, `Client / Project` (Endereço do imóvel afetado), `Status` (Open ou Resolved), `Assigned To` (Equipe), `Service Date` (A data agendada para a visita do instalador).

**2. Modal "New Service" (Criar Novo Chamado) na página Home:**
- O formulário pedirá Cliente/Projeto, Equipe, a disciplina (Siding, Janela, etc).
- **Service Date:** Apenas *uma* data da ida do profissional.
- **Notes / Description:** TextArea grandão para relatar o BO (ex: "cliente acionou garantia pela janela vazando").
- **Upload Dropzone:** Pra subir a foto ou vídeo do buraco na parede que o cliente te mandou por whatsapp.

**3. Detalhe e Resolução do Chamado ("Service Report")**
- Clicar no modal abre a "ficha do paciente".
- Contém todas as notas de quem atendeu e as fotos iniciais.
- Campo de **Service Report**: Para a Crew (Instalador) redigir formalmente o final da missão (Ex: "Pin solto recolocado") e anexar uma mídia da vitória.

---

## 🏗️ Requisitos do Módulo "Sistema de Materiais e Adicionais" (Workflow da Crew v1)

Com base na análise minuciosa do vídeo *exemplo de como o parceiro faz01.mp4*, nós substituiremos a confusão gigante do Whatsapp/Grupos por um **Workflow de Workflow Interno** contínuo. 

**O Problema Atual:**
- Diversos grupos de WhatsApp (`SULA TEAM`, `Matheus's Team`, `RUBY'S TEAM`).
- A Crew manda fotos soltas e mensagens tipo "Quant: 8 peça D 1/8", a vendedora (Ex: Ruby) encaminha pro Cliente, Cliente aprova no texto, aí a Vendedora volta no WhatsApp e diz "Aprovado!", então o escritório vai no Home Depot comprar. Ou então tem que jogar manualmente na linha/coluna torta da Planilha Financeira do GSheets. Processo engessado, doloroso e com risco de prejuízo financeiro!

**A Solução no Siding Depot (Visão da Crew / Parceiro):**
Ao logar no próprio celular, o Parceiro (ex: Sula) abre a página de "Meus Projetos" ("Meus Jobs").

**Fluxo 1: Requisição de Adicionais (Add-ons / Change Orders pelo próprio celular)**
Se a equipe destelhou tudo e encontrou madeira podre, eles *não mandam o orçamento pelo Whatsapp*.
1. O Parceiro abre a aba do seu job e clica no botão: **Solicitar Material/Adicional**.
2. Ele digita na caixa a observação do que *precisa de fato* e das complicações que acharam. (Ex: "A janela tá mole, precisa quebrar o trim").
3. Ele joga/anexa a FOTO da madeira podre diretamente nessa tela no próprio app do Siding Depot, e informa a quantidade. *(OBS: O Parceiro **NUNCA** coloca o preço/dólar, ele só aponta a quantidade material bruto).*

**Fluxo 2: Aprovação pela Vendedora e Cliente**
1. O sistema envia uma **Notificação / Alerta (Pendente Approval)** direto para a dashboard e celular do Vendedor responsável pelo cliente (Ruby, Armando ou Matheus), dentro do sistema.
2. O Vendedor (sendo a parte "Comercial") entra no painel, vê a foto da madeira podre levantada pela Crew e lá sim **atribui o Custo em Dólar final ($95,00)**.
3. O Vendedor com 1 clique envia para a fila do *Customer Portal* (Opcional) ou clica no botão "Aprovar (Preço Cheio)". Se o cliente já aprovou por mensagem de texto, ele mesmo entra e clica que a *Change Order* "Está Aprovada".
4. Ao clicar em Aprovado, o módulo financeiro (antiga planilha chata) magicamente atualiza a coluna do "Job Extra Amount" sozinho com $95 nas metas da empresa.

**Fluxo 3: Ação do Escritório (Compra Material)**
- Uma vez APROVADO pela Vendedora, a moça do Office (Ex: Emily/Felicia) loga no seu Módulo e enxerga aquele ticket verde no board. Ela finalmente clica no link do *Home Depot* ou apenas faz a compra no cartão de crédito da empresa.
- O lixo caótico do WhatsApp e da planilha morre, e tudo fica atrelado como `Material Orders` permanentemente ligado no *Job Detail*.
