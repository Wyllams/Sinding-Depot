---
tags:
  - settings
  - siding-depot
  - configurações
  - perfil
  - rbac
created: 2026-04-17
---

# ⚙️ Settings — Configurações

> Voltar para [[🏗️ Siding Depot — Home]]

**Rota:** `/settings`

---

## My Profile

| Campo | Ação |
|-------|------|
| **Avatar** | Upload direto para Supabase Storage (`avatars` bucket) com preview instantâneo |
| **Full Name** | Editável, reflete instantaneamente na TopBar |
| **Phone** | Editável |
| **Email** | Read-only (vinculado ao Auth) |
| **Role** | Read-only (somente admin pode alterar) |

> [!NOTE]
> Ao salvar o perfil, o evento `profile-updated` é disparado no `window`, atualizando o avatar e nome na TopBar em tempo real.

---

## Organization Profile

| Campo | Valor Padrão |
|-------|--------------|
| **Legal Name** | Siding Depot |
| **Tax ID** | 12-3456789 |
| **Timezone** | GMT-6:00 Central Time (Dallas) |

---

## Users & Permissions

| Feature | Detalhes |
|---------|----------|
| **User Table** | Lista todos os profiles com avatar, nome, email |
| **Role Dropdown** | Admin pode alterar role de qualquer usuário |
| **Active Toggle** | Ativar/desativar acesso do usuário |
| **Invite User** | Modal para convidar novo membro (nome, email, role) |
| **Role Matrix** | Link para configuração avançada de permissões (rota `/settings/role/new`) |

### Roles Disponíveis

| Role | Badge Color |
|------|-------------|
| `admin` | Verde lima `#aeee2a` |
| `salesperson` | Azul `#38bdf8` |
| `partner` | Roxo `#a855f7` |
| `customer` | Cinza padrão |

> Veja também: [[Autenticação e Controle de Acesso]]

---

## Relacionados
- [[Autenticação e Controle de Acesso]]
- [[Banco de Dados]]
