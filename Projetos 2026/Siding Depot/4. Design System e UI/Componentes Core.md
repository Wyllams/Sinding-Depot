# 🧩 Componentes Core

Para escalar de forma segura, criamos componentes que encapsulam dores de cabeça do React, para os novos programadores nunca mais se preocuparem com Z-Indexes quebrados ou inputs de fone zoados.

## O Lendário: `CustomDropdown` (Portal UI)
- **Problema Antigo:** Dropdowns de select padrão HTML (`<select>`) são impossíveis de customizar a aparência ("ugly by design"). Porém, construir um dropdown custom que obedeça `overflow-hidden` nas tabelas sempre gera caixas cortadas.
- **Solução:** Nosso `CustomDropdown.tsx` renderiza o "conteúdo" da lista por cima de toda a aplicação no `<body />` através de `createPortal()` do React, e faz os cálculos via boundingClientRect da "âncora" para flutuar os resultados exatamente onde devem sem clipagem.

## Masked Inputs (Padrão de UI)
- Números de telefone nunca devem ser cadastrados soltos `9876543210`.
- O utilitário universal de formatação reativa abraça de imediato o formato americano: `(XXX) XXX-XXXX`. Isso é enforced no `CustomerForm.tsx`, no `Job Scheduling` pane e em toda query da DB.

## Double Check Modals
Nenhum botão de exclusão perigoso lança chamadas imediatas para APIs de DELETE. Eles chamam funções `onToggleModal` que montam um `React Portal` Modal fullscreen preto (backdrop-blur-sm) obrigando o usuário a ler uma frase de alerta vermelha, cancelando o event listener subjacente se focar fora do escopo.

---
**Relações (Map):**
- A Paleta oficial espelhada nesses modais e textos: [[Design System e Padrões]]
- A utilização massiva de dropdowns na prática: [[Módulo - Windows & Doors Tracker]]
