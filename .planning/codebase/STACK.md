# Technology Stack
> Mapped: 2026-04-27

## Languages & Runtime

| Technology | Version | Usage |
|-----------|---------|-------|
| **TypeScript** | ^5 | Primary language, strict mode enabled |
| **JavaScript** | ES2017 target | Build target for compatibility |
| **CSS** | Tailwind v4 + CSS Modules | Styling (globals.css + DynamicContractForm.module.css) |
| **SQL** | PostgreSQL (via Supabase) | Database schema, RLS policies, migrations |
| **Python** | 3.x | One-off utility script (`remove_bg.py`) |

## Frameworks & Core Libraries

| Framework | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.2.3 | App Router, SSR/SSG, API Routes, Server Actions, Middleware |
| **React** | 19.2.4 | UI components, hooks, client interactivity |
| **Tailwind CSS** | ^4 | Utility-first CSS framework |
| **next-intl** | ^4.9.1 | Internationalization (EN, PT, ES) |
| **next-themes** | ^0.4.6 | Dark/Light theme management |

## Backend / Data Layer

| Library | Version | Purpose |
|---------|---------|---------|
| **@supabase/supabase-js** | ^2.103.0 | Supabase client SDK (browser + server) |
| **@supabase/ssr** | ^0.10.2 | SSR cookie-based auth via `createBrowserClient` / `createServerClient` |
| **nodemailer** | ^8.0.5 | SMTP email sending |
| **resend** | ^6.12.0 | Transactional email API |
| **web-push** | ^3.6.7 | Web Push notifications (VAPID) |
| **@aws-sdk/client-s3** | ^3.1033.0 | Cloudflare R2 file storage (S3-compatible) |

## UI / Frontend Utilities

| Library | Version | Purpose |
|---------|---------|---------|
| **lucide-react** | ^1.8.0 | Icon system |
| **@react-pdf/renderer** | ^4.5.1 | Client-side PDF generation (signed docs, COC) |
| **jimp** | ^0.22.10 | Server-side image processing (compression, bg removal) |
| **@vercel/speed-insights** | ^2.0.0 | Performance monitoring |

## Dev Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| **@tailwindcss/postcss** | ^4 | PostCSS plugin for Tailwind |
| **eslint** | ^9 | Linting |
| **eslint-config-next** | 16.2.3 | Next.js ESLint rules |

## Configuration Files

| File | Purpose |
|------|---------|
| `web/tsconfig.json` | TypeScript config — strict mode, bundler module resolution, `@/*` path alias |
| `web/next.config.ts` | Next.js config — `next-intl` plugin, `nodemailer` external package, 10MB body limit for Server Actions |
| `web/postcss.config.mjs` | PostCSS with Tailwind |
| `web/eslint.config.mjs` | ESLint v9 flat config |
| `web/.env.local` | Environment variables (Supabase URL/keys, R2 credentials, VAPID keys, Resend API key) |

## Build & Deploy

| Aspect | Value |
|--------|-------|
| **Build command** | `next build` |
| **Dev command** | `next dev` |
| **Hosting** | Vercel (Edge Network, automatic deploys from GitHub) |
| **Node runtime** | Vercel serverless functions |
| **Package manager** | npm (package-lock.json present) |
