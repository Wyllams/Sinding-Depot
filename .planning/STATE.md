# Project State

## Current Milestone
Milestone 1: Estabilização v1 (14 Itens)

## Current Phase
MILESTONE COMPLETE (except Phase 5 — deferred)

## Phase Status
Done

## Progress
- Phases complete: 13 / 14 (Phase 5 skipped — user deciding on approach)
- Current blocker: None

## History
- 2026-04-27: Project initialized with GSD workflow
- 2026-04-27: Codebase mapped (7 documents in .planning/codebase/)
- 2026-04-27: Requirements defined (14 REQs)
- 2026-04-27: Roadmap created (14 phases in sequential order)
- 2026-04-28: **Phase 1 COMPLETE** — Change Orders Portal do Cliente: data de solicitação + grid mobile
- 2026-04-28: **Phase 2 COMPLETE** — Mobile responsivo já coberto pela Phase 1
- 2026-04-28: **Phase 3 COMPLETE** — COC: Salesperson, Contract Signed Date, Property Address completo
- 2026-04-28: **Phase 4 COMPLETE** — Labor Bills: Crew dropdown filtrado por disciplina do template
- 2026-04-28: Phase 5 SKIPPED — Color Selection: user deciding on approach
- 2026-04-28: **Phase 6 COMPLETE** — Labor Bills card in Documents tab (replaces Site Photos)
- 2026-04-28: **Phase 7 COMPLETE** — Auto-revert job status to "pending" when all assignments removed
- 2026-04-28: **Phase 8 VERIFIED** — Calendar drag & drop already allows any date. No code change needed.
- 2026-04-28: **Phase 9 COMPLETE** — Projects table sorted by contract_signed_at DESC (nulls last)
- 2026-04-28: **Phase 10 COMPLETE** — Sales Performance accordion sorted oldest → newest (ascending)
- 2026-04-28: **Phase 11 COMPLETE** — Cash Payments sorted by payment date DESC (latest first)
- 2026-04-28: **Phase 12 COMPLETE** — Windows popup: label corrected to "What is the price?", persistence verified OK
- 2026-04-28: **Phase 13 COMPLETE** — Decks popup: price field added above Scope, persisted to contracted_amount
- 2026-04-28: **Phase 14 COMPLETE** — Doors popup: label corrected to "What is the price?", persistence verified OK
- 2026-04-28: **BUGFIX** — ClickOne Webhook integration: completed /api/webhook/clickone/schedule to update existing client project dates.
- 2026-04-28: **BUGFIX** — UI: Removed duplicate SQ indicators on job cards and removed confusing "End Date" metric from project KPI strip.
- 2026-04-28: **BUGFIX** — Cascade Engine: Fixed UTC timezone bug causing start dates to shift to the next day.
- 2026-04-28: **BUGFIX** — Cascade Engine: Fixed Siding + Paint simultaneous creation bug so Paint strictly cascades to the next working day.
- 2026-04-28: **INFRA** — Decision made to utilize Supabase Storage (100GB on Pro) over Vercel Blob for heavy media to minimize egress costs and leverage RLS.
- 2026-04-28: **SECURITY** — Advised on enabling "Have I Been Pwned" (Password Leak Protection) in Supabase Auth (Pro plan feature).
- 2026-04-28: **SECURITY** — Generated scripts to resolve Supabase Security Advisor warnings (Public Bucket Listing & Security Definer execution privileges).
