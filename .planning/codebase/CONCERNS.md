# Concerns
> Mapped: 2026-04-27

## 🔴 Critical Issues

### 1. Mega-File Components
**Files affected:**
- `web/app/(shell)/projects/[id]/page.tsx` — **254KB** (single file!)
- `web/app/(shell)/schedule/page.tsx` — **72KB**
- `web/components/FieldChangeOrderModal.tsx` — **21.9KB**
- `web/components/DynamicContractForm.tsx` — **19.3KB**
- `web/components/WeeklyWeather.tsx` — **20.7KB**
- `web/components/ProjectWeatherCard.tsx` — **18.7KB**
- `web/components/NewServiceCallModal.tsx` — **18.7KB**

**Impact:** Files this large are extremely difficult to maintain, debug, and review. The `projects/[id]/page.tsx` at 254KB likely contains thousands of lines of JSX, state, and business logic in a single component.

**Recommendation:** Decompose into smaller, focused sub-components. Extract hooks, split by concern (tabs, sections, modals).

### 2. No Automated Tests
**Impact:** No test coverage for critical business logic (cascade scheduling, duration calculations, RBAC). Regressions are only caught manually.

**Risk:** High — especially for `cascade-scheduler.ts` and `duration-calculator.ts` which contain complex algorithms that directly affect operations.

### 3. No Validation Library (Zod) Found in Dependencies
Despite the project documentation mentioning Zod for validation, **Zod is not listed in `package.json` dependencies**. Runtime validation may be missing or using ad-hoc approaches.

**Impact:** External data from API routes, webhooks, and form submissions may not be validated consistently.

---

## 🟡 Medium Issues

### 4. Auth Pattern — `getSession()` in Middleware
The middleware uses `supabase.auth.getSession()` which reads from cookies. Supabase's documentation recommends `getUser()` for server-side auth verification as `getSession()` doesn't validate the JWT against the server.

**File:** `web/middleware.ts` (line 73)

**Impact:** Potential for session spoofing if cookies are tampered with. Low risk in practice due to RLS enforcement at the database level.

### 5. Double Database Query in Middleware
The middleware queries `profiles` table **twice** for authenticated users:
1. Line 87-91: When authenticated user hits auth route (to get role for redirect)
2. Line 100-104: When authenticated user hits protected route (to check role + active status)

**Impact:** Every protected page request makes 1-2 extra DB queries. At scale, this adds latency.

**Recommendation:** Combine into a single query or cache role in session metadata.

### 6. No Error Boundary Components
No React Error Boundaries found. Unhandled errors in any component will crash the entire page.

**Recommendation:** Add error.tsx files in key route groups (`(shell)`, `customer`, `field`).

### 7. Hardcoded Business Data
Partner names, service categories, and salesperson data are hardcoded in `lib/constants.ts`:
```typescript
partners: ["XICARA", "XICARA 02", "WILMAR", "WILMAR 02", "SULA", "LUIS"]
```

**Impact:** Adding/removing crews requires code changes and redeployment instead of admin UI configuration. This conflicts with the crew management module in the admin panel.

### 8. Mixed Language Comments
Comments alternate between English and Portuguese without consistency. Some files have Portuguese section headers, others English.

**Impact:** Minor — affects readability for potential collaborators.

---

## 🟢 Low Issues / Technical Debt

### 9. No Loading States (loading.tsx)
No `loading.tsx` files found in route groups. Pages may flash or show blank content during SSR/data fetching.

### 10. Dual Email Provider
Both `nodemailer` and `resend` are dependencies. Having two email providers adds complexity. Consider standardizing on one.

### 11. Python Script in Web Project
`web/remove_bg.py` — a Python utility for background removal exists alongside the TypeScript project. Should be moved to a separate tools directory or replaced with a Node.js equivalent (jimp is already available).

### 12. Backup Files in Project
Multiple `.bak` files at various levels:
- `Siding Depot/current_issues.bak`
- `Siding Depot/current_issues_utf8.bak`
- `web/current_issues.bak`

Should be added to `.gitignore` and cleaned up.

### 13. Feature Specs as Plain Text Files
Feature documentation lives as `.txt` files at the project root (`Schedule.txt`, `DASHBOARD.txt`, `Novo projeto.txt`, etc.). These should ideally be in a `docs/` directory or integrated into `.planning/`.

---

## Security Considerations

### ✅ Good Practices
- **RLS enabled** on all sensitive tables
- **Middleware RBAC** enforces role-based access at the HTTP level
- **Inactive user blocking** — signs out and redirects disabled accounts
- **Public route whitelisting** — only specific routes bypass auth

### ⚠️ Areas to Review
- **No rate limiting** on API routes
- **No CSRF protection** beyond Next.js defaults
- **10MB body size limit** for Server Actions — could be exploited for resource exhaustion
- **Webhook endpoint** (`/api/webhook/`) — verify authentication mechanism
- **Admin route** (`/api/admin/`) — ensure strong authorization checks

---

## Performance Considerations

### Bottlenecks
1. **254KB page component** — likely results in large JS bundle for project detail page
2. **Middleware DB queries** — 1-2 Supabase queries per request for role checking
3. **No ISR/static generation** — all pages appear to be SSR or client-rendered
4. **No image optimization** beyond jimp compression — consider Next.js Image component usage

### Strengths
- **Supabase Realtime** for live updates (avoids polling)
- **Lazy Supabase client** avoids build-time crashes
- **Vercel Edge deployment** provides fast global CDN
- **Tailwind CSS** produces minimal CSS output
