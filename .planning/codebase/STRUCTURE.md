# Directory Structure
> Mapped: 2026-04-27

## Project Root (`Siding Depot/`)

```
Siding Depot/
├── .planning/                    # GSD planning context (NEW)
│   └── codebase/                 # Codebase mapping documents
├── supabase/                     # Database layer
│   ├── migrations/               # 17 SQL migration files
│   └── seed.sql                  # Initial seed data
├── web/                          # Next.js application
│   ├── app/                      # App Router pages & routes
│   ├── components/               # Shared UI components
│   ├── lib/                      # Business logic & utilities
│   ├── i18n/                     # Internationalization config
│   ├── messages/                 # i18n translation files (EN, PT, ES)
│   ├── public/                   # Static assets
│   ├── scripts/                  # Utility scripts
│   ├── src/                      # Additional source (minimal)
│   └── [config files]            # next.config.ts, tsconfig.json, etc.
├── Planilhas modelos/            # Spreadsheet templates (business docs)
├── Projetos 2026/                # Project data files
├── Videos/                       # Training/demo videos
└── [*.txt, *.md files]           # Feature specs & documentation
```

## App Router Structure (`web/app/`)

```
app/
├── layout.tsx                    # Root layout (ThemeProvider, i18n, fonts)
├── globals.css                   # Global styles (Tailwind + custom tokens)
├── icon.png                      # App favicon
│
├── (auth)/                       # Auth route group (login, forgot-password, reset)
│   └── [auth pages]
│
├── (shell)/                      # Admin dashboard route group
│   ├── layout.tsx                # Shell layout (Sidebar + TopBar)
│   ├── page.tsx                  # Dashboard home (8.7KB)
│   ├── schedule/                 # Gantt schedule (72KB — flagship feature)
│   ├── projects/                 # Project list + detail
│   │   └── [id]/                 # Project detail page (254KB — mega component)
│   ├── new-project/              # Project creation wizard
│   ├── crews/                    # Crew management
│   ├── services/                 # Service catalog management
│   ├── team/                     # Team/salesperson management
│   ├── settings/                 # App settings
│   ├── change-orders/            # Change order management
│   ├── labor-bills/              # Labor billing
│   ├── cash-payments/            # Cash payment tracking
│   ├── sales-reports/            # Sales dashboard & KPIs
│   └── windows-tracker/          # Windows/Doors/Decks material tracker
│
├── customer/                     # Customer portal (RLS-isolated)
│   ├── layout.tsx                # Customer layout (branded, minimal nav)
│   ├── page.tsx                  # Customer dashboard (13.8KB)
│   ├── change-orders/            # Customer change order approval
│   ├── colors/                   # Customer color selection
│   └── documents/                # Customer document access
│
├── field/                        # Crew/Partner portal (mobile-optimized)
│   ├── layout.tsx                # Field layout
│   ├── page.tsx                  # Field dashboard (4KB)
│   ├── jobs/                     # Job assignments view
│   ├── profile/                  # Crew profile
│   ├── requests/                 # Service requests
│   └── services/                 # Service status updates
│
├── mobile/                       # Salesperson mobile portal
│   ├── layout.tsx                # Mobile layout (bottom nav)
│   └── sales/                    # Sales-specific views
│
├── sales/                        # Sales area (desktop)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── jobs/                     # Sales job management
│   └── profile/                  # Salesperson profile
│
├── api/                          # API route handlers
│   ├── admin/                    # Admin-only operations
│   ├── customers/                # Customer CRUD
│   ├── documents/                # Document management
│   ├── services/                 # Service type CRUD
│   ├── users/                    # User management
│   ├── push/                     # Push notification endpoint
│   ├── upload/                   # File upload handler
│   ├── webhook/                  # Inbound webhooks
│   ├── colors/                   # Color utilities
│   ├── test-email/               # Email testing
│   └── logout/                   # Session logout
│
├── actions/                      # Server Actions
│   └── i18n.ts                   # Internationalization action
│
├── jobs/                         # Public job routes
└── projects/                     # Public project routes (contract view)
```

## Components (`web/components/`)

```
components/
├── Sidebar.tsx                   # Admin sidebar navigation (6.3KB)
├── SidebarContext.tsx             # Sidebar state context
├── TopBar.tsx                     # Admin top bar (13.2KB)
├── ThemeProvider.tsx              # Dark/Light theme wrapper
├── ThemeSwitcher.tsx              # Theme toggle button
├── LanguageSwitcher.tsx           # i18n language selector
├── CustomDatePicker.tsx           # Reusable date picker (12.8KB)
├── CustomDropdown.tsx             # Reusable dropdown (6.6KB)
├── DateRangePicker.tsx            # Date range selector (15.3KB)
├── DynamicContractForm.tsx        # Contract creation form (19.3KB)
├── DynamicContractForm.module.css # Contract form styles (12.4KB)
├── ManageListModal.tsx            # Generic list management modal
├── NewServiceCallModal.tsx        # New service call form (18.7KB)
├── NotificationBell.tsx           # Notification bell with badge (9.5KB)
├── ProjectWeatherCard.tsx         # Per-project weather card (18.7KB)
├── WeeklyWeather.tsx              # 7-day weather forecast (20.7KB)
├── ServiceReportPanel.tsx         # Service report display (10.3KB)
├── UndoContext.tsx                # Undo stack context (1.9KB)
│
├── coc/                          # Certificate of Completion
│   └── ClientForm.tsx             # COC client form (6.9KB)
├── field/                        # Field/Crew-specific components
│   ├── FieldBottomNav.tsx         # Mobile bottom nav (2.4KB)
│   ├── FieldTopBar.tsx            # Field top bar (6.2KB)
│   ├── FieldCOCModal.tsx          # Field COC modal (15.3KB)
│   ├── FieldChangeOrderModal.tsx  # Field change order (21.9KB)
│   ├── FieldDailyLogModal.tsx     # Daily log modal (11.2KB)
│   ├── FieldServiceReportModal.tsx# Service report modal (13.7KB)
│   └── MobileWeatherWidget.tsx    # Mobile weather (16.4KB)
├── sales/                        # Sales-specific components
│   ├── SalesBottomNav.tsx         # Sales mobile nav (2.3KB)
│   └── SalesTopBar.tsx            # Sales top bar (6KB)
├── mobile/                       # Mobile-shared components
└── pwa/                          # PWA/Service Worker components
```

## Lib (`web/lib/`)

```
lib/
├── cascade-scheduler.ts          # Cascade scheduling engine (13.4KB)
├── duration-calculator.ts        # SQ-based duration calc (7.4KB)
├── scheduling-flag.ts            # Feature flag for scheduling
├── constants.ts                  # Single source of truth (6.8KB)
├── supabase.ts                   # Lazy Supabase client singleton (1.1KB)
├── compressImage.ts              # Image compression utility (3.8KB)
├── r2.ts                         # Cloudflare R2 S3 client (0.9KB)
├── push-notifications.ts         # Push notification setup (5.5KB)
├── send-push.ts                  # Push notification sender (2.8KB)
├── email/
│   └── send-signed-document.ts   # Email with signed PDF (4.1KB)
├── hooks/
│   └── useRealtimeSubscription.ts# Supabase Realtime hook (2.4KB)
└── pdf/
    └── signed-document.tsx       # PDF template for signed docs (10.5KB)
```

## Naming Conventions

| Convention | Pattern | Example |
|-----------|---------|---------|
| **Route folders** | kebab-case | `new-project/`, `change-orders/`, `sales-reports/` |
| **Components** | PascalCase | `TopBar.tsx`, `CustomDatePicker.tsx` |
| **Lib files** | kebab-case | `cascade-scheduler.ts`, `duration-calculator.ts` |
| **API routes** | kebab-case folders | `api/push/notify/`, `api/test-email/` |
| **Migrations** | timestamp prefix | `202604110001_auth_profiles.sql` |
| **i18n messages** | lowercase ISO | `en.json`, `pt.json`, `es.json` |
| **CSS Modules** | PascalCase.module.css | `DynamicContractForm.module.css` |

## Key Observations

- **Mega-files:** `projects/[id]/page.tsx` (254KB) and `schedule/page.tsx` (72KB) are extremely large single-file components — strong candidates for decomposition
- **No `src/` convention:** Code lives directly in `web/app/`, `web/components/`, `web/lib/` (not inside `src/`)
- **Path alias:** `@/*` maps to `web/*` root
- **Business docs at root:** Feature specs (`.txt` files) and documentation (`.md` files) live at project root alongside code
