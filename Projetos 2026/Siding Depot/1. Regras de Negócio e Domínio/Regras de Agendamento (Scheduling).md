# 📅 Regras de Agendamento (Scheduling)

O motor de agendamento é o coração operacional da Siding Depot. Ele garante que os parceiros não entrem no local da obra na ordem errada, respeitando dependências lógicas de execução.

## A Ordem Obrigatória (Dependências)

Quando um projeto envolve múltiplas disciplinas, **existe uma hierarquia física** que precisa ser respeitada. Apenas a disciplina subsequente pode iniciar quando a anterior for concluída (ou, pelo menos, previamente agendada e em andamento coordenado).

1. **Measurement (Medição):** Pré-requisito para comprar materiais, especialmente Windows.
2. **Siding / Roofing:** O "básico" e externo.
3. **Windows & Doors:** Exige que a estrutura externa principal (Siding) esteja alinhada, mas variações podem ocorrer dependendo da Change Order.
4. **Paint (Pintura):** Só pode ocorrer depois que todo o acabamento, molduras (fascia) e paredes/siding estiverem prontos.
5. **Gutters (Calhas):** A etapa final que coroa o exterior. Exige que a pintura (Fascia) e o telhado (Roofing) estejam finalizados.

## Como o Prazo é Calculado

- **Metragem vs Dias (Fuzzy Logic Automática):** 
  - A precisão do tempo previsto para a obra depende da *metragem* inserida no momento da venda (contrato).
  - Um algoritmo simples divide a metragem total pela produtividade padrão de uma *Crew* (em 'Sq' ou Linear Feet). Exemplo: 20 Sq de Siding geralmente = 2 dias úteis de trabalho.
  
- **Sincronia no Banco (`jobs` x `crews`):**
  - Cada vez que um Agendamento é modificado, a tabela `jobs` atualiza as colunas de `install_date`, `finish_date` e vincula o ID correspondente da `crew_id_ref` correta na mesma query.

---
**Relações (Map):**
- A interface de manipulação (drag-and-drop) dessas lógicas no frontend: [[Job Schedule]] e [[Módulo - Projetos e Tracking]]
- Compreenda quem tem permissão de acionar esses gatilhos em: [[Autenticação e Permissões (Roles)]]
