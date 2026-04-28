# External Integrations
> Mapped: 2026-04-27

## Database — Supabase (PostgreSQL)

- **Provider:** Supabase (hosted PostgreSQL)
- **Client (browser):** Lazy singleton via Proxy pattern in `web/lib/supabase.ts`
- **Client (server):** `createServerClient` from `@supabase/ssr` in `web/middleware.ts` and Server Actions
- **Auth:** Supabase Auth with email/password, session cookies via SSR
- **RLS:** Enabled on all sensitive tables (jobs, service_assignments, customers, etc.)
- **Realtime:** WebSocket subscriptions via `useRealtimeSubscription` hook (`web/lib/hooks/useRealtimeSubscription.ts`)
- **Storage:** Used for document uploads (contracts, signed forms, photos)
- **Migrations:** 17 SQL files in `supabase/migrations/` covering auth, domain schema, scheduling, documents, sales, notifications, payments, and color selections

## File Storage — Cloudflare R2 (S3-compatible)

- **SDK:** `@aws-sdk/client-s3` v3
- **Config:** `web/lib/r2.ts` — uses `S3Client` with R2 endpoint, access key, secret key from env vars
- **Purpose:** Document and image storage (contracts, photos, signed documents)
- **Upload endpoint:** `web/app/api/upload/`

## Email — Dual Provider

### Nodemailer (SMTP)
- **Config:** `web/lib/email/send-signed-document.ts`
- **Purpose:** Sending signed document PDFs as email attachments
- **Provider:** Custom SMTP (configured via env vars)

### Resend
- **SDK:** `resend` v6
- **Purpose:** Transactional emails (test emails, notifications)
- **Endpoint:** `web/app/api/test-email/`

## Push Notifications — Web Push API

- **SDK:** `web-push` v3
- **Config:** `web/lib/push-notifications.ts`, `web/lib/send-push.ts`
- **Protocol:** VAPID (Voluntary Application Server Identification)
- **Storage:** Device tokens in `device_subscriptions` table
- **Endpoint:** `web/app/api/push/notify/`
- **PWA support:** Service Worker registration in `web/components/pwa/`

## PDF Generation — @react-pdf/renderer

- **Config:** `web/lib/pdf/signed-document.tsx`
- **Purpose:** Client-side PDF rendering for signed contracts and Certificates of Completion
- **Component:** `web/components/coc/ClientForm.tsx`

## Weather API

- **Components:** `web/components/ProjectWeatherCard.tsx`, `web/components/WeeklyWeather.tsx`
- **Purpose:** Per-project weather forecasting integrated with schedule view
- **Usage:** Helps admins make proactive rescheduling decisions

## Authentication Flow

```
Browser → Middleware (createServerClient) → Supabase Auth → getSession()
  ├── Not authenticated → redirect /login
  ├── Authenticated + auth route → redirect to role home
  └── Authenticated + protected route → check role against ROLE_ALLOWED_ROUTES
       ├── Allowed → continue
       └── Blocked → redirect to role home
```

### Roles & Access
| Role | Home Route | Allowed Routes |
|------|-----------|---------------|
| admin | `/` | `*` (all) |
| salesperson | `/mobile/sales` | `/mobile/sales`, `/projects`, `/change-orders`, `/sales-reports`, `/schedule`, `/api` |
| partner | `/field` | `/field`, `/projects`, `/change-orders`, `/schedule`, `/api` |
| crew | `/field` | `/field`, `/projects`, `/change-orders`, `/schedule`, `/api` |
| customer | `/customer` | `/customer`, `/api` |
| client | `/customer` | `/customer`, `/api` |

## Webhooks

- **Endpoint:** `web/app/api/webhook/`
- **Purpose:** Receiving external lead data (inbound webhooks from third-party sources)

## Hosting & CDN

- **Platform:** Vercel (Edge Network)
- **CI/CD:** GitHub → Vercel automatic deploys on `main` branch push
- **SSL:** Automatic via Vercel
- **Monitoring:** Vercel Speed Insights
