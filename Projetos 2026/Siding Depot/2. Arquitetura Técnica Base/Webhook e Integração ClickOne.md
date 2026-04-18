# 🔗 Webhook e Integração ClickOne

O contrato é assinado e fechado num ambiente de vendas externo chamado **ClickOne**. O Siding Depot foi contruído para automatizar a ingestão silenciosa destes contratos de vendas, sem que alguém precise redigitar as ordens de serviço.

## O Fluxo Inbound (Webhook)

1. **Assinatura:** O cliente aceita o contrato e insere suas infos no ClickOne.
2. **Disparo do POST:** O ClickOne faz um disparado para o nosso endpoint Next.js (ex: `POST /api/webhooks/clickone`).
3. **Validação do Secret:** O nosso Route Handler verifica se o payload possui o cabeçalho Authorization com a nossa secret registrada.
4. **Tratamento Zod:** O payload é passado num schema do Zod para garantir que a tipagem do contrato contenha nome do cliente, endereço, valor e e-mail.
5. **Criação do Job & Customer:** 
   - A tabela `customers` varre se o e-mail já existe. Se não, cria.
   - Um novo `job` nasce atrelado a esse `customer_id`. As medições descritas caem no campo json da obra.

## Automação do Cliente (Silent Provisioning)

Uma vez que o Webhook criou a linha na tabela `customers`:
- O Admin tem a capacidade de ativar a máquina de comunicação. 
- Um novo usuário na camada Supabase `auth.users` é criado (usando uma senha gerada pelo servidor ou um Magic Link).
- O cliente recebe um e-mail com as boas vindas: "Acesse seu portal em sidingdepot.com/p/".

## O Que Pode Dar Errado (Pontos de Atenção)
- A conversão de strings de endereço complexas para formatação geolocável para o map da dashboard pode bugar e apresentar lat/logs inconsistentes.
- Falha na validação, que exigirá a criação de um "Job de Emergência" manual sem amarração do ClickOne id. Resolução na interface UI.

---
**Relações (Map):**
- Essa mecânica tem total sinergia com o controle de acessos: [[Autenticação e Permissões (Roles)]]
- Tabela onde de fato criamos: [[Arquitetura do Banco de Dados]]
