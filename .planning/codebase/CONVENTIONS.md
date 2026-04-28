# Code Conventions
> Mapped: 2026-04-27

## TypeScript Conventions

### Strict Mode
- `"strict": true` in `tsconfig.json`
- ES2017 target with ESNext modules
- `isolatedModules: true` for Vercel compatibility

### Type Patterns
- **Explicit interfaces** for domain models (e.g., `ServiceCategory`, `StatusConfig`, `SalesColor`, `ScheduledJob` in `lib/constants.ts`)
- **Type unions** for constrained values (e.g., `ServiceId = "siding" | "doors_windows_decks" | "paint" | "gutters" | "roofing"`)
- **Record types** for config maps (e.g., `Record<string, StatusConfig>`, `Record<string, SalesColor>`)
- **Optional chaining** used extensively (e.g., `profile?.role || 'admin'`)

### Import Conventions
- Path alias `@/*` maps to project root
- `import type` used for type-only imports (e.g., `import type { NextRequest }`)
- Named exports preferred over default exports in lib files
- Default exports for page/layout components (Next.js convention)

## React/Next.js Conventions

### Component Patterns
- **Client Components:** Marked with `'use client'` when interactivity is needed
- **Server Components:** Default for pages — data fetching at the server level
- **No component library:** All UI is custom-built with Tailwind classes
- **CSS Modules:** Used selectively for complex styled components (`DynamicContractForm.module.css`)
- **Context providers:** `SidebarContext`, `UndoContext`, `ThemeProvider` for cross-component state

### State Management
- **No global state library** (no Redux, Zustand, Jotai)
- **React Context** for UI state (sidebar, undo stack, theme)
- **Supabase Realtime** for server state synchronization
- **Local state** (`useState`) for component-level interactivity
- **Undo stack:** Custom implementation with 50-level history (`MAX_UNDO` constant)

### Data Fetching
- **Server-side:** Supabase queries in Server Components / Server Actions
- **Client-side:** Direct Supabase SDK calls from Client Components
- **Realtime:** `useRealtimeSubscription` custom hook for live updates
- **No React Query / SWR** — all data fetching is direct Supabase calls

## Supabase Conventions

### Client Pattern
```typescript
// Browser client — lazy singleton via Proxy
import { supabase } from '@/lib/supabase';

// Server client — per-request in middleware/actions
const supabase = createServerClient(url, key, { cookies: {...} });
```

### Query Pattern
- Always use `.select()` with explicit columns when possible
- Always check for `error` in destructured response
- RLS policies handle authorization — no manual `WHERE user_id = ?` in app code

### Migration Naming
- Format: `YYYYMMDDNNNN_descriptive_name.sql`
- Sequential numbering within same day (e.g., `202604110001`, `202604110002`, ...)
- Descriptive suffixes: `_auth_profiles`, `_domain_core_schema`, `_scheduling_module`

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `CustomDatePicker`, `FieldChangeOrderModal` |
| Pages | `page.tsx` (Next.js) | `app/(shell)/schedule/page.tsx` |
| Layouts | `layout.tsx` (Next.js) | `app/(shell)/layout.tsx` |
| Lib functions | camelCase | `getSalesColors()`, `mapCodeToServiceId()` |
| Lib files | kebab-case | `cascade-scheduler.ts`, `push-notifications.ts` |
| Constants | UPPER_SNAKE | `SERVICE_CATEGORIES`, `STATUS_CONFIG`, `DAY_LABELS` |
| Types/Interfaces | PascalCase | `ServiceCategory`, `ScheduledJob`, `StatusConfig` |
| API routes | kebab-case dirs | `api/push/notify/`, `api/test-email/` |
| DB tables | snake_case | `service_assignments`, `job_services`, `cash_payments` |
| DB columns | snake_case | `scheduled_start_at`, `contract_amount`, `partner_name` |
| CSS classes | Tailwind utilities | `flex items-center gap-2 text-sm` |
| i18n keys | dot notation | `dashboard.title`, `schedule.dragHint` |

## Error Handling

### Middleware
- Guards against missing env vars with early return + console.error
- Inactive users are signed out and redirected with error query param

### API Routes
- Try/catch with error responses (HTTP status codes)
- Supabase error checking: `if (error) { ... }`

### Client Components
- Optimistic updates with undo on failure
- Toast notifications for user-facing errors
- Console.warn for non-critical issues (e.g., blocked route access)

## Code Organization Rules

### Constants Rule
> **`web/lib/constants.ts` is the SINGLE SOURCE OF TRUTH.**
> Every page/component that needs `SERVICE_CATEGORIES`, `STATUS_CONFIG`, `SALES_COLORS`, or shared types MUST import from here.
> DO NOT redefine these constants in individual page files.

### Comments Style
- Section headers: `// ─── Section Name ───────────────────────`
- Box headers: `// ═══════════════════════════════════════════`
- JSDoc-style function documentation (selective, not comprehensive)
- Portuguese comments in middleware and business logic files

## Internationalization

- **Library:** `next-intl` v4
- **Languages:** English (`en.json`), Portuguese (`pt.json`), Spanish (`es.json`)
- **Config:** `web/i18n/request.ts` + `web/app/actions/i18n.ts`
- **Usage:** `useTranslations('namespace')` hook in Client Components
- **Integration:** Wrapped via `createNextIntlPlugin()` in `next.config.ts`
