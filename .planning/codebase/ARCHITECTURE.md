# Architecture
> Mapped: 2026-04-27

## Pattern: Monolithic Next.js App Router with Supabase BaaS

The application follows a **monolithic full-stack** architecture using Next.js App Router as both the frontend framework and API layer, with Supabase providing the backend-as-a-service (database, auth, storage, realtime).

```
┌──────────────────────────────────────────────────────┐
│                    VERCEL (Hosting)                    │
│  ┌────────────────────────────────────────────────┐  │
│  │              Next.js App Router                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │ Pages    │  │ API      │  │ Server       │ │  │
│  │  │ (SSR/CSR)│  │ Routes   │  │ Actions      │ │  │
│  │  └─────┬────┘  └────┬─────┘  └──────┬───────┘ │  │
│  │        │             │               │          │  │
│  │        ▼             ▼               ▼          │  │
│  │  ┌────────────────────────────────────────────┐ │  │
│  │  │          Middleware (Auth + RBAC)           │ │  │
│  │  └────────────────────┬───────────────────────┘ │  │
│  └───────────────────────┼─────────────────────────┘  │
│                          ▼                             │
│  ┌───────────────────────────────────────────────────┐│
│  │                    SUPABASE                        ││
│  │  ┌──────────┐ ┌──────┐ ┌─────────┐ ┌──────────┐ ││
│  │  │PostgreSQL│ │ Auth │ │ Storage │ │ Realtime │ ││
│  │  │ + RLS    │ │      │ │         │ │ (WS)     │ ││
│  │  └──────────┘ └──────┘ └─────────┘ └──────────┘ ││
│  └───────────────────────────────────────────────────┘│
│                          │                             │
│  ┌───────────────────────┼───────────────────────────┐│
│  │          EXTERNAL SERVICES                         ││
│  │  ┌──────┐ ┌────────┐ ┌─────────┐ ┌────────────┐ ││
│  │  │ R2   │ │Resend/ │ │Web Push │ │ Weather    │ ││
│  │  │(S3)  │ │Mailer  │ │ (VAPID) │ │ API        │ ││
│  │  └──────┘ └────────┘ └─────────┘ └────────────┘ ││
│  └───────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

## Layers

### 1. Presentation Layer
- **Pages:** React components in `web/app/` using App Router conventions
- **Layouts:** Route group layouts — `(auth)` for login, `(shell)` for admin dashboard, `customer` for client portal, `field` for crew portal, `mobile` for salesperson
- **Components:** Shared UI in `web/components/`, with sub-folders for domain-specific components (`coc/`, `field/`, `sales/`, `mobile/`, `pwa/`)

### 2. Business Logic Layer
- **Server Actions:** `web/app/actions/` — currently minimal (i18n action)
- **API Routes:** `web/app/api/` — RESTful endpoints for admin, customers, documents, services, push, upload, webhook
- **Middleware:** `web/middleware.ts` — authentication guard + role-based access control (RBAC)
- **Lib utilities:** `web/lib/` — scheduling logic, duration calculation, constants, image compression, email, push notifications

### 3. Data Access Layer
- **Browser client:** `web/lib/supabase.ts` — lazy singleton Proxy pattern using `createBrowserClient`
- **Server client:** Created per-request in middleware and Server Actions using `createServerClient`
- **Realtime:** `web/lib/hooks/useRealtimeSubscription.ts` — WebSocket subscription hook
- **No ORM:** Direct Supabase SDK queries with `.select()`, `.insert()`, `.update()`, `.delete()`

### 4. Data Layer
- **PostgreSQL** via Supabase with Row-Level Security (RLS)
- **17 migrations** in `supabase/migrations/` — sequential schema evolution
- **Seed data:** `supabase/seed.sql` for initial test data

## Key Abstractions

### Service Scheduling Engine
- **`web/lib/cascade-scheduler.ts`** — Cascade logic: moving a predecessor service shifts all successors (Siding → Paint → Gutters → Roofing)
- **`web/lib/duration-calculator.ts`** — SQ-based duration calculation using crew production tables
- **`web/lib/scheduling-flag.ts`** — Feature flag for scheduling behavior

### Constants as Single Source of Truth
- **`web/lib/constants.ts`** — All shared types, service categories, status configs, salesperson colors, day labels, and helper functions
- Enforced as single import point — no duplication across pages

### Role-Based Architecture
- **4 distinct portals** with dedicated layouts, navigation, and data access:
  - **Admin** (`/(shell)`) — Full CRUD, Gantt schedule, crew management
  - **Salesperson** (`/mobile/sales`) — Mobile-first, sales pipeline
  - **Crew/Partner** (`/field`) — Job assignments, status updates, daily logs
  - **Customer** (`/customer`) — Read-only job tracking, change order approval

## Entry Points

| Entry Point | File | Purpose |
|-------------|------|---------|
| Root layout | `web/app/layout.tsx` | Theme providers, i18n, global CSS, fonts |
| Admin dashboard | `web/app/(shell)/page.tsx` | Main dashboard with KPIs, tables, charts |
| Schedule | `web/app/(shell)/schedule/page.tsx` | Gantt chart (72KB — largest single file) |
| Project details | `web/app/(shell)/projects/[id]/page.tsx` | Mega-page (254KB — extremely large) |
| Customer portal | `web/app/customer/page.tsx` | Client-facing job status |
| Field portal | `web/app/field/page.tsx` | Crew job assignments |
| Sales portal | `web/app/sales/page.tsx` | Salesperson mobile interface |
| Middleware | `web/middleware.ts` | Auth + RBAC for all routes |

## Data Flow

### Typical Read Flow (Admin viewing schedule)
```
Browser → Next.js Page (SSR) → Supabase Client → PostgreSQL (RLS enforced)
                                                      ↓
Browser ← React Hydration ← Server Component response ←
                                                      ↓
Browser → Supabase Realtime (WS) → Live schedule updates
```

### Typical Write Flow (Drag-drop schedule change)
```
Browser → Client Component (event handler) → Supabase SDK .update()
                                                      ↓
PostgreSQL validates RLS → Cascade scheduler recalculates
                                                      ↓
Supabase Realtime broadcasts → All connected browsers receive update
```
