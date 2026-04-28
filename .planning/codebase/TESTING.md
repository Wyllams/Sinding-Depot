# Testing
> Mapped: 2026-04-27

## Current State

### No Automated Tests

The project currently has **no automated test suite**:
- No test framework configured (no Jest, Vitest, Playwright, or Cypress)
- No `test` script in `package.json`
- No `__tests__/` directories
- No `.test.ts` or `.spec.ts` files found
- No CI/CD pipeline running tests

### Linting Only
- **ESLint v9** with `eslint-config-next` for static analysis
- `"lint": "eslint"` script in `package.json`

## Testing Recommendations

### Priority 1: Critical Business Logic (Unit Tests)
These files contain pure business logic and should be tested first:
- `web/lib/cascade-scheduler.ts` — Cascade scheduling logic
- `web/lib/duration-calculator.ts` — SQ-based duration calculations
- `web/lib/constants.ts` — mapCodeToServiceId(), getSalesColors(), getInitials()

### Priority 2: API Route Handlers (Integration Tests)
- `web/app/api/` — Validate request/response contracts
- `web/middleware.ts` — Role-based access control enforcement

### Priority 3: E2E Flows (Browser Tests)
- Schedule drag-and-drop with cascade
- Project creation wizard
- Customer portal change order approval
- Role-based routing (each portal)

## Manual Testing

Currently, all testing is manual:
- **Developer testing:** Running `next dev` and testing in browser
- **Production monitoring:** Vercel Speed Insights
- **Database validation:** Supabase Dashboard for data integrity
- **Auth testing:** Test accounts created via migration `202604110015_test_accounts.sql`

## Test Infrastructure Available

The seed file (`supabase/seed.sql`) provides initial test data for manual testing against a development Supabase instance.
