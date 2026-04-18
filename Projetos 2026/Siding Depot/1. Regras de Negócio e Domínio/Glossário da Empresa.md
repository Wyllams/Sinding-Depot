# 📑 Glossário da Empresa

Este glossário unifica a nomenclatura utilizada tanto pela equipe de campo (Crews/Sales) quanto pelo código. Usar as palavras exatas reduz atrito entre negócios e tech.

## Termos Core

### 1. [[Change Orders]]
**O que é:** Uma alteração no contrato original (adicional de serviço, ajuste de preço, etc.).
**No Sistema:** É tratado como um anexo (arquivo) ligado diretamente a um `job`. Afeta o total pago ou escopo.

### 2. [[Services e Warranty|Service Call (Warranty)]]
**O que é:** Um chamado de manutenção, reparo físico ou garantia de um trabalho já concluído.
**No Sistema:** Gerenciado no módulo de Services. Possui diferentes origens (Roofing, Siding, etc.) e necessita agendamento específico com uma crew.

### 3. Measurement
**O que é:** A etapa de medição oficial pós-venda.
**No Sistema:** É a disciplina inicial (marcada em laranja). Crucial para garantir a precisão dos materiais (ex: janelas).

### 4. Discipline (Trades)
**O que é:** Os tipos de serviços vendidos e executados.
**No Sistema:** Cada job é tagueado por uma listagem restrita:
- Siding (Azul)
- Windows & Doors (Roxo)
- Paint (Verde)
- Gutters (Ciano)
- Roofing (Vermelho)

### 5. Gating System (Gates)
**O que é:** O estágio macro-operacional em que um projeto se encontra.
**No Sistema:** Reflete-se na coluna `gate_status` da tabela `jobs`. Define quem é o "dono" atual da bola (ex: *Gate 1 - Sales*, *Gate 4 - Installation*).

### 6. [[Crews e Partners|Crew / Partner]]
**O que é:** Os parceiros/empreiteiros que executam os serviços de fato.
**No Sistema:** Mapeados na tabela `crews`. Um Job só pode ser iniciado se as datas de `start_date` / `end_date` forem atribuídas junto com o Partner exato responsável por aquela disciplina.

---
**Relações (Map):**
- As rotinas de agendamento dependem destas disciplinas definidas no banco: [[Regras de Agendamento (Scheduling)]]
- O Status "Gates" é alterado no módulo de projetos: [[Módulo - Projetos e Tracking]]
