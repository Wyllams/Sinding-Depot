# 🚨 Regras de Padronização — OBRIGATÓRIO

> [!CAUTION]
> Este documento é **LEI**. Toda implementação, correção ou feature nova em QUALQUER acesso (Admin, Vendedor, Parceiro, Cliente) DEVE seguir estas regras **SEM EXCEÇÃO**.

---

## Princípio Fundamental

**O Siding Depot é UM software unificado, NÃO um Frankenstein.**

O acesso **Admin** define o padrão. Todos os outros acessos (Vendedor, Parceiro, Cliente) herdam obrigatoriamente:
- Design tokens (cores, fontes, espaçamentos)
- Padrões de componentes (TopBar, BottomNav, Cards, Botões, Modais)
- Comportamentos de UX (animações, transições, hover states)
- Estrutura de layout

---

## Design Tokens — Fonte Única de Verdade

### Paleta de Cores (Dark Mode)

| Token | Hex | Uso |
|---|---|---|
| `bg-primary` | `#0d0f0d` | Background principal (header, sidebar) |
| `bg-surface` | `#181a18` | Cards, dropdowns, modais |
| `bg-input` | `#0a0a0a` | Campos de input |
| `border-subtle` | `#474846/20` | Bordas suaves |
| `border-default` | `#474846/50` | Bordas padrão |
| `text-primary` | `#faf9f5` | Texto principal |
| `text-secondary` | `#ababa8` | Texto secundário |
| `text-muted` | `#474846` | Texto desabilitado/hint |
| `accent-green` | `#aeee2a` | Cor primária (ações, ativo, CTAs) |
| `accent-red` | `#ff7351` | Cor de perigo (logout, delete) |

### Tipografia

| Elemento | Fonte | Peso | Tracking |
|---|---|---|---|
| Headlines | `Manrope, system-ui` | `font-black` | `-0.01em` |
| Body text | `system-ui, sans-serif` | `font-bold` | normal |
| Labels/badges | `system-ui` | `font-bold` | `tracking-widest` |
| Text size paddings | `text-xs` (12px) para labels, `text-sm` (14px) para body |  |  |

### Ícones — Material Symbols Outlined

**OBRIGATÓRIO usar Material Symbols em TODOS os acessos:**
```html
<span class="material-symbols-outlined" translate="no">icon_name</span>
```

**PROIBIDO misturar** com Lucide React, Heroicons, ou qualquer outra lib de ícones. Se um componente já usa Lucide, deve ser migrado para Material Symbols.

---

## Componentes Padrão

### TopBar (Header)

O padrão do Admin é a referência:

```
┌─────────────────────────────────────────────┐
│ ☰  [Title]              [Actions] [Avatar]  │
│     subtitle                                │
└─────────────────────────────────────────────┘
```

**Regras:**
- Background: `bg-[#0d0f0d]/80 backdrop-blur-3xl`
- Border: `border-b border-[#474846]/20`
- Height: `py-3 sm:py-4` (não usar h-fixo)
- Avatar com foto real do `profiles.avatar_url` ou iniciais em verde
- Dropdown de perfil com: nome, role, "My Profile", divider, "Sign Out"
- Dropdown bg: `bg-[#181a18]`, border: `border-white/5`, rounded: `rounded-xl`

### BottomNav (Mobile)

```
┌─────────────────────────────────────────────┐
│   🏠      💼       🔔        👤             │
│  HOME    DEALS   ALERTS   PROFILE           │
└─────────────────────────────────────────────┘
```

**Regras:**
- Background: `bg-[#050505]/95 backdrop-blur-md`
- Border top: `border-t border-zinc-800`
- Rounded: `rounded-t-3xl`
- Ativo: `text-[#aeee2a] scale-110` + `drop-shadow glow`
- Inativo: `text-zinc-500`
- Labels: `text-[10px] font-bold tracking-wider`
- Ícones: Material Symbols com `FILL 1` quando ativo

### Cards

- Background: `bg-[#181a18]` ou `bg-[#0a0a0a]`
- Border: `border border-white/5` ou `border-zinc-800`
- Rounded: `rounded-2xl` ou `rounded-3xl`
- Padding: `p-5` ou `p-6`

### Botões

**Primário (CTA):**
- `bg-[#aeee2a] text-[#121412] font-black uppercase tracking-widest`
- Hover: `hover:brightness-110`
- Active: `active:scale-[0.98]`

**Secundário:**
- `bg-transparent border border-[#474846] text-[#faf9f5]`
- Hover: `hover:bg-[#242624]`

**Perigo:**
- `text-[#ff7351] hover:bg-[#ff7351]/10`

### Modais e Dropdowns

- Background: `bg-[#181a18]`
- Border: `border border-white/5`
- Shadow: `shadow-2xl`
- Animação: `animate-in fade-in zoom-in-95 duration-200`

---

## Layout Mobile — Padrão para TODOS os acessos

```tsx
<div className="bg-[#000000] min-h-screen flex justify-center">
  <div className="w-full max-w-md h-[100dvh] bg-[#050505] flex flex-col border-x border-zinc-900">
    <TopBar />
    <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
      {children}
    </div>
    <BottomNav />
  </div>
</div>
```

---

## Segurança — Controle de Acesso por Role (RBAC)

> [!CAUTION]
> **NUNCA** um role deve poder acessar rotas de outro role. O middleware DEVE bloquear.

| Role | Rotas Permitidas | Home |
|---|---|---|
| `admin` | `*` (tudo) | `/` |
| `salesperson` | `/sales`, `/api` | `/sales` |
| `partner` / `crew` | `/field`, `/api` | `/field` |
| `customer` / `client` | `/customer`, `/api` | `/customer` |

**Arquivo:** `web/middleware.ts`

---

## Checklist para Criar Novo Acesso / Nova Página

- [ ] Usa os design tokens do Admin? (cores, fontes, espaçamentos)
- [ ] Usa Material Symbols (não Lucide/Heroicons)?
- [ ] TopBar segue o padrão? (bg, blur, avatar, dropdown)
- [ ] BottomNav segue o padrão? (glow, fill, escala)
- [ ] Layout mobile com `max-w-md` e `100dvh`?
- [ ] Middleware bloqueia acesso cruzado entre roles?
- [ ] Profile carrega dados reais do Supabase (`profiles` table)?
- [ ] Avatar usa `profiles.avatar_url`?
- [ ] Sign Out via `/api/logout`?

---

## Tags Obsidian

#design-system #padronização #obrigatório #segurança #ui-ux
