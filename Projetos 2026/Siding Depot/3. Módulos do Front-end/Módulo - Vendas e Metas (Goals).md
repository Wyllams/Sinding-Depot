# 🎯 Módulo - Vendas e Metas (Goals)

Onde os leões da Siding Depot acompanham seus alvos: A visualização real de onde estamos vs Onde queremos chegar.

## Lógica Não-Mandatória das Metas (Goals Agnostic Track)

Antigamente em CRMs travados, se o gerente não botasse meta no dia X, o sistema não funcionava. O nosso foi recriado para ser inteiramente flexível:

1. **Os 5 Prazos Disponíveis:** Anual, Semestral, Trimestral, Mensal e Semanal.
2. **Priorização e Exact Match:** Se um vendedor tem uma meta real "Exata" gravada num mês (ex: Março: $100K), o frontend deve mostrar essa. Se ele **não tem**, o UI faz um Prorrate (Rateio). 
  - *Exemplo Prorrateo:* Meta Anual de $1.2M declarada, mas nenhuma mensal estipulada. O front dinâmico dividirá $1.2M por 12, mostrando que o vendedor *deveria* bater $100.000 em Julho para bater o alvo anual (Prorated Monthly).
3. **Set Goals Module:** Interface minimalista e ágil, em painéis sanfona, que permitem setar a meta num click, e imediatamente recalcular o Dashboard.

## Visualizações no Dashboard

- **Leaderboard Rankings:** Exclui dinamicamente usuários ocultos (ex: Armando) da renderização. Os top-selling agents competem através do calculo puro do CashFlow vindo só de Projetos *Vendidos*, independente dos Pagamentos já coletados.
- **Grids Anuais e Mensais:** Utilizam flex-boxes puros sem "Table" pesadas em HTML para garantir alinhamento perfeito. Uma barra de percentagem reativa (0-100+%) transita a cor de Vermelho pra Laranja pra Verde Neon (`progress-bar` dynamics) quando a meta explode os limites estipulados.

---
**Relações (Map):**
- Como criamos essas barras com estilo de ponta: [[Design System e Padrões]]
