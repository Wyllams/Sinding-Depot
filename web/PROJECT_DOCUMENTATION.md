# Siding Depot – Full Project Documentation
### For Market Research & Business Analysis — Georgia, USA

---

## 1. Executive Summary

**Siding Depot** is a proprietary, full‑stack **SaaS platform** designed specifically for **exterior‑service contractors** (siding, painting, roofing, gutters, doors/windows/decks) operating in the **Southeastern United States**, with primary operations in **Georgia**.

The platform digitizes the entire operational lifecycle of a contracting company — from **lead intake** and **contract generation**, through **crew scheduling** and **service execution**, to **financial tracking** (cash payments, labor bills, change orders) and **customer communication** (client portal, push notifications).

### Key Business Value Proposition

| Problem | Siding Depot Solution |
|---------|----------------------|
| Manual scheduling via spreadsheets/whiteboards | Interactive weekly Gantt chart with drag‑&‑drop and automatic cascade logic |
| No visibility into crew availability | Real‑time crew assignment with specialty filtering |
| Cash payment tracking on paper | Digital cash‑payment registry with audit trail |
| Change orders communicated verbally | Formal change‑order system with approval workflows |
| Customers don't know job status | Self‑service client portal with live status updates |
| Salespeople can't track their pipeline | Dedicated sales dashboard with KPIs and goal tracking |
| Weather delays cause confusion | Integrated weather forecasting per project location |

---

## 2. Market Context — Georgia, USA (2025–2026)

### 2.1 Construction Industry in Georgia

- **$26.3 billion** in facility investments and new construction over the past year (ConstructConnect, 2026).
- Construction contributes approximately **$45 billion (5% of GDP)** to the state economy (AGC, 2024).
- Roughly **28,000 construction firms** operate in Georgia.
- The Southeast remains one of the **top‑performing regions** for residential construction in the US.

### 2.2 Siding & Exterior Services Market

- The **US siding market** is projected to grow at **4–5% CAGR through 2030**, driven by new housing starts and renovation demand.
- Georgia's residential renovation market is particularly strong due to **aging housing stock** and **population growth** in the Atlanta metro area.
- Key material trends: fiber cement, engineered wood, and vinyl siding dominate the Southeast market.
- **Labor shortages** remain the #1 challenge — making efficient crew scheduling software critical for profitability.

### 2.3 Construction Management SaaS Market

- **Global market size (2025):** $7–10.8 billion (Grand View Research, Fortune Business Insights).
- **North America** accounts for **32–42.5%** of the global market.
- **US‑specific market:** approximately **$1.8–2.7 billion** in 2025.
- Growth is driven by **cloud adoption**, **mobile‑first workflows**, and **labor optimization needs**.

### 2.4 Competitive Landscape

| Competitor | Target Audience | Monthly Cost | Key Differentiator |
|------------|----------------|--------------|-------------------|
| **Buildertrend** | Residential builders, remodelers | $399–$1,099/mo (flat) | All‑in‑one for residential; strong financial tools |
| **JobNimbus** | Roofing & exterior contractors | $300–$1,200+/mo (per user) | CRM‑focused; sales pipeline management |
| **AccuLynx** | Roofing contractors | $250+/mo (per user) | Aerial measurement integrations; roofing‑specific |
| **ServiceTitan** | Mid‑large field service (HVAC, plumbing) | $245–$398+/technician | Enterprise‑grade; expensive onboarding ($5K–$50K) |
| **Jobber** | Small field service companies | $69–$349/mo | Simple; mobile‑first; consumer‑grade UX |
| **Procore** | General contractors (commercial) | Custom enterprise pricing | Industry leader for large commercial projects |
| **Siding Depot** *(this product)* | Siding & exterior‑service contractors | **Custom / not yet publicly priced** | **Built specifically for siding + multi‑service exterior companies; cascade scheduling; integrated weather; 4 distinct user portals** |

### 2.5 Market Gap Identified

Most existing solutions are either:
1. **Too broad** (Buildertrend, Procore) — designed for general construction, not specialty exterior services.
2. **Too narrow** (AccuLynx) — built for roofing only, not multi‑trade exterior work.
3. **Too expensive** (ServiceTitan) — prohibitive for small/mid‑size contractors with $5K–$50K onboarding fees.
4. **Not trade‑aware** — none offer **automatic cascade scheduling** where moving one service (e.g., Siding) automatically shifts dependent services (Paint → Gutters → Roofing) while respecting crew specialties.

**Siding Depot fills this gap** by providing a purpose‑built platform for **multi‑service exterior contractors** at a price point accessible to small and medium businesses.

---

## 3. Platform Architecture

### 3.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) + React 19 + Tailwind CSS | Server‑side rendering, client interactivity, responsive design |
| **API Layer** | Next.js API Routes + Server Actions | RESTful endpoints, business logic, auth checks |
| **Database** | Supabase (PostgreSQL) | Relational data storage with Row‑Level Security (RLS) |
| **Authentication** | Supabase Auth | Email/password login, session management, role‑based access |
| **Real‑time** | Supabase Realtime (WebSockets) | Live schedule updates across all connected devices |
| **File Storage** | Supabase Storage | Documents, photos, contracts, signed forms |
| **Push Notifications** | Web Push API + Supabase Edge Functions | Instant alerts to crews and customers |
| **Hosting** | Vercel (Edge Network) | Global CDN, automatic SSL, CI/CD from GitHub |
| **Language** | TypeScript (strict mode) | Type safety across entire codebase |
| **Validation** | Zod | Runtime schema validation for all external data |
| **Internationalization** | next‑intl (i18n) | Multi‑language support (English + Portuguese) |

### 3.2 Infrastructure Costs (estimated monthly)

| Service | Plan | Estimated Cost |
|---------|------|---------------|
| Vercel | Pro | $20/mo |
| Supabase | Pro | $25/mo |
| Domain + SSL | — | $12/yr |
| **Total** | — | **~$47/mo** |

> Low infrastructure cost is a major competitive advantage compared to solutions like ServiceTitan that require expensive self‑hosted infrastructure.

---

## 4. User Roles & Access Levels (4 Portals)

The platform provides **4 distinct user experiences**, each tailored to a specific stakeholder:

### 4.1 🔴 Admin Portal (Company Owner / Operations Manager)

**Access:** Full read/write to all data, all pages, all API routes.

| Capability | Description |
|-----------|-------------|
| **Dashboard** | Overview of active jobs, revenue, crew utilization, pending items |
| **Job Scheduling** | Weekly Gantt chart with drag‑&‑drop, cascade logic, undo system (50 levels) |
| **Crew Management** | Create/edit/deactivate crews; assign specialties; view crew availability |
| **Service Catalog** | Define service types (Siding, Paint, Gutters, Roofing, Doors/Windows/Decks) |
| **Cash Payments** | Record, edit, and audit all cash transactions |
| **Change Orders** | Create, approve, and track scope changes with cost impact |
| **Labor Bills** | Review labor hours, approve crew payments, manage pay rates |
| **Sales Reports** | KPIs by salesperson, goal tracking (weekly/monthly/quarterly/annual) |
| **Project Wizard** | Step‑by‑step form to create new jobs with automatic service assignments |
| **Team Management** | Manage salespersons (Matheus, Armando, Ruby), assign roles |
| **Windows Tracker** | Specialized tracker for door/window/deck material estimates |
| **Settings** | Feature toggles, branding, email templates, notification preferences |
| **User Management** | Create accounts, assign roles, reset passwords |

### 4.2 🟢 Salesperson Portal

**Access:** Jobs assigned to them only (enforced by database‑level RLS policies).

| Capability | Description |
|-----------|-------------|
| **Personal Dashboard** | Sales pipeline, conversion rates, quota progress |
| **Job Creation** | Create new projects via the wizard; assign services and schedules |
| **Customer Management** | View and manage their assigned customers |
| **Change Orders** | Initiate change orders and send for customer approval |
| **Sales Reports** | View their own KPIs, revenue per period, job status breakdown |
| **Document Upload** | Upload contracts, photos, signed forms |
| **Mobile‑Optimized UI** | Bottom‑nav mobile interface for field use |

### 4.3 🟡 Crew Member Portal

**Access:** Only their assigned service assignments (RLS on `crew_id`).

| Capability | Description |
|-----------|-------------|
| **Schedule View** | See their assigned jobs for the current and upcoming weeks |
| **Status Updates** | Mark services as `in_progress` or `done` |
| **Job Details** | View customer address, phone, service scope, and SQ (square footage) |
| **Labor Logging** | Submit hours worked per job |
| **Push Notifications** | Receive alerts when jobs are reassigned or rescheduled |

### 4.4 🔵 Customer Portal

**Access:** Read‑only for their own jobs (RLS on `customer_id`).

| Capability | Description |
|-----------|-------------|
| **Job Status** | Real‑time view of service progress and crew assignment |
| **Documents** | Access contracts, invoices, and signed change orders |
| **Change Order Approval** | Review and approve/reject scope changes digitally |
| **Contact** | Direct messaging to assigned salesperson |
| **Notifications** | Receive push updates when job status changes |
| **Dark / Light Mode** | Respects system theme preference |

---

## 5. Core Features — Detailed Breakdown

### 5.1 Job Scheduling Engine (Gantt Chart)

This is the **flagship feature** and the primary differentiator.

- **View:** Weekly calendar with 7 columns (Mon–Sun), rows grouped by crew/partner.
- **Drag‑&‑Drop:** Move any service bar to a different day or crew. Validates specialty match (e.g., a painting crew can't receive a siding job).
- **Cascade Logic:** Moving a predecessor service automatically shifts all successors:
  - `Siding` → `Paint` → `Gutters` → `Roofing`
  - `Doors/Windows/Decks` → `Paint` (starts after MAX of Siding end, Decks end)
- **Sunday Exclusion:** All date calculations skip Sundays — standard for GA construction.
- **Dynamic Status Colors:**
  - 🔴 Pending (red) — job on hold
  - 🟡 Tentative (amber) — awaiting confirmation
  - 🔵 Confirmed / Scheduled (blue)
  - 🟢 In Progress (green) — auto‑detected when today is within date range
  - ✅ Done (green check) — auto‑detected after 6 PM on end date
- **Undo System:** Stack of 50 actions with toast notification for quick revert.
- **Real‑time Sync:** All connected browsers see changes instantly via Supabase Realtime.
- **SQ‑Based Duration:** Service duration is auto‑calculated from square footage using crew‑specific production tables (`duration-calculator.ts`).

### 5.2 Service Categories & Partners

| Category | Color | Icon | Partners (Crews) |
|----------|-------|------|-------------------|
| Siding | `#aeee2a` (lime) | `home_work` | XICARA, XICARA 02, WILMAR, WILMAR 02, SULA, LUIS |
| Doors / Windows / Decks | `#f5a623` (amber) | `sensor_door` | SERGIO |
| Paint | `#60b8f5` (sky blue) | `format_paint` | OSVIN, OSVIN 02, VICTOR, JUAN |
| Gutters | `#c084fc` (purple) | `water_drop` | LEANDRO |
| Roofing | `#ef4444` (red) | `roofing` | JOSUE |

### 5.3 Project Wizard (New Job Creation)

A multi‑step form (`DynamicContractForm`) that:
1. Captures customer info (name, phone, email, address).
2. Selects services to be performed (checkboxes).
3. Enters square footage (SQ) for duration estimation.
4. Assigns a salesperson.
5. Sets contract amount.
6. Auto‑creates `jobs`, `job_services`, and initial `service_assignments` in one transaction.

### 5.4 Cash Payments Module

- Records cash transactions against jobs.
- Audit trail: who recorded, when, amount, linked job.
- Zod validation prevents invalid data.
- Admin‑only editing; salesperson‑only insertion.

### 5.5 Change Orders

- Tracks scope changes after a job is scheduled.
- Fields: description, additional cost, status (pending → approved → completed).
- Linked to original `service_assignments`.
- Customer can approve/reject via client portal.

### 5.6 Labor Bills

- Crews log hours per service assignment.
- Admin reviews and approves.
- Auto‑calculates total cost using crew‑specific rates from `crew_rates` table.
- API validates all payloads with Zod.

### 5.7 Sales Reports Dashboard

- **Metrics:** total sales, jobs by status, SQ totals, revenue by partner.
- **Goal Tracking:** weekly, monthly, quarterly, semi‑annual, annual targets per salesperson.
- **Visualizations:** cards + charts (Recharts library).
- **Aggregation:** via Supabase RPC functions for performance.

### 5.8 Weather Integration

- `ProjectWeatherCard` shows current and forecasted weather for each project's location.
- `WeeklyWeather` displays a 7‑day forecast aligned with the schedule view.
- Helps admins make proactive rescheduling decisions for rain/wind days.

### 5.9 Push Notifications

- Web Push API integration for real‑time alerts.
- Stores device tokens in `device_subscriptions`.
- Triggers on job status changes, crew reassignments, and change‑order approvals.
- Works on both desktop (Chrome/Edge/Firefox) and mobile (Android PWA).

### 5.10 Internationalization (i18n)

- Full multi‑language support via `next-intl`.
- Currently supports: **English** (primary) and **Portuguese**.
- All UI strings externalized in `/messages/` directory.
- `LanguageSwitcher` component available in the TopBar.

---

## 6. Database Schema (Supabase / PostgreSQL)

### 6.1 Core Tables

| Table | Purpose | Key Columns | RLS Policy |
|-------|---------|-------------|------------|
| `jobs` | Master job record | `id`, `status`, `salesperson_id`, `customer_id`, `sq`, `contract_amount`, `city`, `state` | Salesperson sees own; customer sees own; admin sees all |
| `service_assignments` | Individual service tasks | `id`, `job_service_id`, `crew_id`, `scheduled_start_at`, `scheduled_end_at`, `status` | Crew sees own assignments; admin sees all |
| `job_services` | Services within a job | `id`, `job_id`, `service_type_id`, `quantity`, `unit_of_measure` | Follows job‑level RLS |
| `service_types` | Service catalog | `id`, `code`, `name` | Read for all authenticated users |
| `crews` | Crew entities | `id`, `name`, `partner_name`, `active` | Admin write; all read |
| `crew_specialties` | Crew‑to‑specialty mapping | `crew_id`, `specialty_id` | Admin write; all read |
| `specialties` | Service specializations | `id`, `code`, `name` | All read |
| `customers` | Client contact info | `id`, `full_name`, `email`, `phone` | Salesperson sees assigned; admin sees all |
| `salespersons` | Salesperson profiles | `id`, `full_name`, `email` | Admin write; self read |
| `cash_payments` | Cash receipt logs | `id`, `job_id`, `amount`, `received_at`, `recorded_by` | Sales insert; admin full |
| `change_orders` | Scope change requests | `id`, `service_assignment_id`, `description`, `additional_cost`, `approved_at` | Sales + admin |
| `settings` | System configuration (JSON) | `id`, `config_json` | Admin only |
| `device_subscriptions` | Push notification tokens | `id`, `user_id`, `endpoint`, `keys` | User sees own |
| `push_notifications` | Notification log | `id`, `user_id`, `payload`, `sent_at` | System insert; user read own |

### 6.2 Row‑Level Security (RLS)

All tables with sensitive data have RLS **enabled by default**. Policies enforce:
- **Admin** bypass: admins can read/write all rows.
- **Salesperson** filter: `salesperson_id = auth.uid()`.
- **Crew** filter: `crew_id IN (SELECT crew_id FROM user_crews WHERE user_id = auth.uid())`.
- **Customer** filter: `customer_id = auth.uid()`.

---

## 7. API Routes

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/admin/*` | Various | Admin only | User management, migrations, system ops |
| `/api/customers` | GET/POST | Salesperson + Admin | CRUD for customers |
| `/api/documents` | GET/POST | Authenticated | File upload/download (Supabase Storage) |
| `/api/services` | GET/POST | Admin | Service type CRUD |
| `/api/users` | GET/PATCH | Authenticated | User profile management |
| `/api/push/notify` | POST | System | Send push notifications |
| `/api/upload` | POST | Authenticated | Generic file upload handler |
| `/api/webhook` | POST | Public (verified) | Incoming webhooks (external leads) |
| `/api/logout` | POST | Authenticated | Sign‑out and session cleanup |
| `/api/colors` | GET | Authenticated | Theme color utilities |
| `/api/test-email` | POST | Admin | Email template testing |

---

## 8. UI / UX Design System

- **Framework:** Tailwind CSS with custom design tokens.
- **Theme:** Light and Dark mode with `ThemeProvider` and `ThemeSwitcher`.
- **Typography:** System fonts optimized for readability.
- **Icons:** Material Design icon set.
- **Color Palette:** Service‑specific colors (lime, amber, sky blue, purple, red) + salesperson colors (green — Matheus, red — Armando, purple — Ruby).
- **Glassmorphism:** Used in contract forms and modals (`DynamicContractForm.module.css`).
- **Responsive:** Desktop‑first with dedicated mobile layouts for field workers.
- **Animations:** Smooth transitions for drag‑&‑drop, toast notifications, and status changes.

---

## 9. Deployment & DevOps

| Aspect | Implementation |
|--------|---------------|
| **Hosting** | Vercel (automatic deploys from GitHub `main` branch) |
| **CI/CD** | GitHub Actions — TypeScript checks, ESLint, Supabase migrations |
| **Environment** | `.env.local` for dev; Vercel Secrets for production |
| **Database Migrations** | `supabase/migrations/` applied via Supabase CLI |
| **Monitoring** | Vercel Speed Insights + Supabase Dashboard |
| **SSL** | Automatic via Vercel |

---

## 10. Unique Selling Points (USPs) vs. Competitors

| Feature | Siding Depot | Buildertrend | JobNimbus | AccuLynx | ServiceTitan |
|---------|:---:|:---:|:---:|:---:|:---:|
| **Multi‑service cascade scheduling** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Siding + exterior trade‑specific** | ✅ | ❌ | Partial | ❌ | ❌ |
| **Drag‑&‑drop Gantt with undo** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Weather integration per project** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **4 distinct user portals** | ✅ | ✅ | Partial | Partial | ✅ |
| **Real‑time crew sync** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SQ‑based auto‑duration** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Low infrastructure cost (<$50/mo)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **No onboarding fee** | ✅ | ❌ ($400–$2K) | ❌ | ❌ | ❌ ($5K–$50K) |
| **Multi‑language (EN/PT)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Change order approval (customer)** | ✅ | ✅ | Partial | ✅ | ✅ |
| **Push notifications** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 11. Scalability & Growth Potential

### 11.1 Current State
- Serving a **single company** with 3 salespersons, ~12 crews, and 5 service categories.
- Processing **real production data** (not a prototype).

### 11.2 Multi‑Tenant SaaS Opportunity
The architecture is ready to evolve into a **multi‑tenant SaaS** by:
1. Adding `organization_id` to all tables.
2. Adjusting RLS policies to include tenant isolation.
3. Creating a self‑service onboarding flow.
4. Implementing usage‑based or per‑seat pricing.

### 11.3 Target Market Size in Georgia
- **28,000 construction firms** in Georgia (AGC data).
- Estimated **3,000–5,000** specialize in exterior services (siding, roofing, painting, gutters).
- At **$99–$299/mo per company** (competitive pricing), the addressable market in Georgia alone is **$3.6M–$17.9M ARR**.
- Expanding to the Southeast region (FL, SC, NC, AL, TN) multiplies this by **5–8x**.

### 11.4 Pricing Strategy (Recommended)

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | $99/mo | 1–3 users, basic scheduling |
| **Professional** | $199/mo | Unlimited users, all features, client portal |
| **Enterprise** | $399/mo | Custom integrations, dedicated support, SLA |

---

## 12. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dependency on Supabase | Medium | Standard PostgreSQL; can migrate to self‑hosted |
| Single‑tenant architecture | Medium | Multi‑tenant migration path defined |
| No mobile native app | Medium | PWA support covers most use cases; native can be added later |
| Small team (1 developer) | High | Well‑documented codebase; modular architecture |
| Competitor awareness | Low | Niche focus provides defensibility |

---

## 13. Conclusion

Siding Depot is a **production‑ready, purpose‑built SaaS** for exterior‑service contractors in Georgia and the Southeastern US. Its unique combination of **cascade scheduling**, **trade‑specific crew management**, **weather integration**, and **4 distinct user portals** addresses a clear market gap between expensive enterprise solutions (ServiceTitan) and generic construction tools (Buildertrend).

The low infrastructure cost (~$47/mo) and modern tech stack (Next.js + Supabase + Vercel) make it financially viable as a startup while providing the scalability needed to grow into a multi‑tenant SaaS serving thousands of contractors across the region.

---

*Document prepared for market research purposes — Georgia, USA — April 2026.*
