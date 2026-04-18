# 🎨 Design System e Padrões

O objetivo de toda feature da Siding Depot é manter o aspecto Premium, usando glassmorphism leve, sombras difusas, Dark Mode consistente e cantos perfeitamente harmoniosos (radii). Rejeitamos designs corporativos "em caixas quadradas brancas com fontes velhas".

## Paleta de Cores e Tags Disciplinares

As disciplinas de uma obra não usam apenas texto; a linguagem visual (Cor) deve responder a pergunta imediatamente na cabeça da equipe de campo.

*   **Siding:** Azul (`bg-blue-600`) - Frio, proteção primária.
*   **Measurement:** Laranja (`bg-orange-500`) - Alerta as crews: Cuidado, as medidas são just-in-time e podem ser vitrais.
*   **Roofing:** Vermelho (`bg-red-600`) - Perigoso, alto, topo da casa.
*   **Windows & Doors:** Roxo (`bg-purple-600`) - Nobreza do acabamento interno moldado.
*   **Paint:** Verde (`bg-emerald-500`) - Estético, renovação final.
*   **Gutters:** Ciano (`bg-cyan-500`) - Linhas d'água fluídas.

## Tailwind Constraints

- Evitamos misturar breakpoints bizarros. Trabalhamos orientados a "Mobile-First", expandindo com `md:` e `lg:` (e.g. O Scheduler View no mobile é uma lista vertical, no Desktop é o quadro Gantt/Table).
- As transições são aplicadas consistentemente nas interações (ex: `transition-all duration-300 ease-in-out hover:scale-[1.02]`). Micro animações importam.

---
**Relações (Map):**
- Como a paleta afeta quem trabalha: [[Módulo - Projetos e Tracking]]
- Reuso de botões padronizados e text inputs: [[Componentes Core]]
