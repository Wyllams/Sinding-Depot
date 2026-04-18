# 🚪 Módulo - Windows & Doors Tracker

De todas as disciplinas, a instalação de Janelas e Portas é a mais demorada pré-obra. Motivo? São produtos 100% customizados, que não dá pra plugar um genérico de Home Depot. Este módulo gerencia essa supply chain crítica.

## Gerenciamento Dinâmico de Fornecedores (Supplier List)

As nossas crews buscam o material dos fornecedores mais diversos do estado.
Para não prender as listagens no banco de dados, prejudicando os Vendedores que sempre negociam fábricas novas:

- **Local Storage Management (Persistance):** A interface consome inicialização dos valores padrões, mas permite o usuário adicionar "Novos Fornecedores" por conta através de um modal "ManageList".
- Essa lista customizada de "Meus Fornecedores Favoritos" é espelhada de volta pro *Local Storage*, mantendo a escolha do usuário gravada no computador próprio dele sem superlotar o Supabase. 

## A Paleta Laranja (Measurement UI)

Dentro do "Windows & Tracker", a palavra-chave é **Medição**. 
Visualmente, tudo que exige "Action" em Windows foi modificado para o tom laranja oficial (Orange). Botões de status, badges, headers. A coesão visual alerta a Crew que ali: "Tem vidro que a gente pode estilhaçar ou a métrica tá errada".

## Uso de React Portals

Para lidar com os grandes Selects interativos (dropdowns), usamos uma técnica com **React Portals**. Isso faz The dropdown renderizar fisicamente lá embaixo no DOM root (`document.body`), debaixo dos panos, mesmo que logicamente pertença a um table row microscópico, impedindo aquele bug chato onde a lista do dropdown é "cortada" na UI (Clipping ou Overflow Hidden).

---
**Relações (Map):**
- Padrão do `CustomDropdown` descrito aqui: [[Componentes Core]]
- Onde a Paleta e Branding foram concebidos: [[Design System e Padrões]]
