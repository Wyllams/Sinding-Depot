---
tags:
  - crews
  - partners
  - siding-depot
  - equipes
created: 2026-04-17
---

# 👷 Crews e Partners — Diretório de Equipes

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `/crews`

---

## Funcionalidades

| Feature | Detalhes |
|---------|----------|
| **Categorização por Especialidade** | Siding, Doors/Windows, Paint, Gutters, Roofing |
| **Status Visual** | Available (verde), Opening Soon (amarelo), Booked Out (vermelho) |
| **Weekly Capacity Chart** | Mini gráfico de capacidade semanal por crew |
| **Jobs Atribuídos** | Lista de [[Projects]] ativas de cada crew |
| **Contato** | Telefone com link direto |
| **Crew Inativação** | Motivo, data, visualização separada |
| **Management Modal** | Adicionar, editar, inativar crews |
| **Inline Status Change** | Mudar status diretamente via dropdown |

---

## Disciplinas e Crews

| Disciplina | Cor | Crews |
|------------|-----|-------|
| **Siding** | `#aeee2a` (Verde lima) | XICARA, XICARA 2, WILMAR, WILMAR 2, SULA, LUIS |
| **Doors/Windows** | `#60b8f5` (Azul) | SERGIO |
| **Paint** | `#f5a623` (Laranja) | OSVIN, OSVIN 2, VICTOR, JUAN |
| **Gutters** | `#c084fc` (Roxo) | LEANDRO |
| **Roofing** | `#fb923c` (Laranja forte) | JOSUE |

---

## Tabelas no [[Banco de Dados]]

| Tabela | Função |
|--------|--------|
| `crews` | Cadastro de equipes/parceiros |
| `crew_specialties` | Especialidades de cada crew |
| `specialties` | Catálogo de especialidades |
| `service_assignments` | Atribuição de crew a serviço com agenda |

---

## Relacionados
- [[Projects]]
- [[Job Schedule]]
- [[New Project]]
- [[Field App]]
