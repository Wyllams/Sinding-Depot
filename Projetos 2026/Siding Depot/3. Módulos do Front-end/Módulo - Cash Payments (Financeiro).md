# 💵 Módulo - Cash Payments (Financeiro)

O livro razão (ledger) da Siding Depot. É a sub-interface encontrada ao destrinchar um documento de Job (em `projects/[id]`). Nela, o ciclo de pagamentos e dívidas de um cliente frente ao orçamento original é trackeado milimetricamente.

## Estrutura Matemática (Original vs Change Orders)

A tela principal do Cash Payments não olha apenas para o valor do Contrato Original assinado.
O Vendedor pode inserir quantos "Change Orders" (Documentos PDFs) forem necessários caso ocorra podridão mista sob a madeira (Rot Replacement).
A interface calcula ao vivo:
`TOTAL devido = Contrato Original + Soma das Change Orders validadas`
A barra de progresso visual de fundos reflete a totalização dos depósitos vs esse novo *Total Real Devido*.

## Lógicas de Deleção com Modais Customizados

*   **A Filosofia "Sem `window.confirm`"**: No início, o browser soltava aquele alert nativo super feio para deletar itens financeiros. Substituímos todo e qualquer fluxo de exclusão financeira por nosso próprio componente `Confirm Delete Modal`.
*   A intenção é assustar de leve o usuário de que essa ação destilará uma Query "DELETE" pesada direto pras tabelas financeiras e afetará balancetes cruciais.
*   **ON DELETE CASCADE:** Se um Administrador usar um Master Override Modal pra apagar a obra (`job`) inteira, todos os registros relacionados dentro desse componente (pagamentos, etc) explodem junto.

---
**Relações (Map):**
- A amarração de um PDF real dentro de uma Change order ocorre no módulo visual de: [[Storage e Anexos]]
- Restrição de exclusão financeira: [[Autenticação e Permissões (Roles)]]
