---
tags:
  - services
  - warranty
  - siding-depot
  - chamados
created: 2026-04-17
---

# 🛠️ Services e Warranty — Chamados de Serviço

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `/services`

---

## Funcionalidades

| Feature | Detalhes |
|---------|----------|
| **Criação de Chamado** | Modal com título, descrição, tipo, disciplina |
| **Disciplinas** | Siding, Doors, Windows, Paint, Gutters, Roofing |
| **Status Pipeline** | `open` → `inspected` → `repairing` → `resolved` |
| **Inline Status Change** | Dropdown colorido na tabela |
| **Crew Assignment** | Atribuição de crew responsável → [[Crews e Partners]] |
| **Service Report Panel** | Painel lateral com detalhes completos |
| **Media Attachments** | Upload de fotos/vídeos via Supabase Storage (`blocker_attachments` bucket) |
| **Undo System** | Sistema global de desfazer ações |
| **Signal System** | Flag de alerta especial com acknowledge |
| **Delete** | Soft delete com confirmação |

---

## Pipeline de Status

```mermaid
graph LR
    A["Open 🔵"] --> B["Inspected 🟡"]
    B --> C["Repairing 🟠"]
    C --> D["Resolved ✅"]
```

---

## Componentes Dedicados

| Componente | Função |
|------------|--------|
| `NewServiceCallModal.tsx` | Modal de criação de novo chamado |
| `ServiceReportPanel.tsx` | Painel lateral de report com upload de mídia |

---

## Schema no [[Banco de Dados]]

| Tabela | Função |
|--------|--------|
| `service_calls` | Chamados de warranty/serviço |
| `blocker_attachments` | Mídia anexada |

---

## Relacionados
- [[Projects]]
- [[Crews e Partners]]
- [[Notificações em Tempo Real]]
