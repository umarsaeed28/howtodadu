# Pencil: admin, monetization, rebrand and content evals

Plan for the eight phases in the brief, written after reading the repo. Nothing below is built yet except where
marked "exists". The rule throughout: use what is installed, keep the FAR engine and the site-plan renderer
untouched, and leave `{{TODO}}` placeholders where a business fact is missing.

## 1. Stack, as found

| Concern | What the repo uses | Notes |
|---|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack), React 19, TypeScript strict | `src/app`, `src/components`, `src/lib`. `src/proxy.ts` is the middleware (Next 16 name). |
| Styling | Tailwind 4, design tokens in `src/app/site.css` (`--ink`, `--green`, `--slate`, ...) | `pencil-design` skill documents the language. Archivo + Public Sans. |
| Database | Supabase Postgres via `@supabase/supabase-js` and `@supabase/ssr`, over HTTP | No ORM, no `DATABASE_URL` in the web app. Migrations in `supabase/migrations/0005`..`0010`, applied to prod by the Supabase GitHub integration on merge to `main`. RLS on every table; `app_role()` returns `profiles.role` (`client`, `admin`, `gc`). |
| Auth | Supabase Auth (email + password). `src/lib/portal/server.ts` `requireViewer(path, roles)`; `proxy.ts` redirects `/portal`, `/dashboard`, `/start`, `/admin`, `/gc` to `/login` without a session | Admin = an email in `portal_admins` at signup. `/api/*` is excluded from the proxy matcher, so API routes guard themselves. |
| Payments | `stripe` 20.4 installed. `PAYMENTS_PROVIDER` = `mock` (default) or `stripe`. Mock provider in `src/lib/payments/index.ts`; Stripe Checkout + signature-checked webhook exist only for the $5,000 permit package (`src/lib/portal/stripe.ts`, `src/app/api/stripe/webhook/route.ts`) | Prices in `src/lib/pricing.ts`: instant $200, reviewed $600, custom plan $3,000, permit $5,000. Orders in `service_orders` (0009). No subscriptions anywhere. |
| Email | Resend REST, `src/lib/portal/notify.ts` (`RESEND_API_KEY`, `PORTAL_FROM_EMAIL`); logs to console when unset | Newsletter signups go to `signups` (kind `newsletter`); nothing sends a newsletter. |
| LLM | `@anthropic-ai/sdk` through one `Llm` interface (`src/lib/ai/llm.ts`): `AnthropicLlm`, `OpenAiCompatibleLlm`, `FallbackLlm`, `llmFor(tier)`. Models and budgets in `src/lib/ai/agents.config.ts`. `RunMeter` counts tokens per run; `dailyBudget` per day (Upstash or memory). Prices are a `PRICES` array inline in `src/lib/ai/usage.ts` | Three call sites: the listing assessment chain (`src/lib/server/dadu-assessment.ts` → `runAssessment`), the custom draft layout (`src/app/api/custom/draft/route.ts`), and `scripts/eval.ts`. Nothing persists per-call records; `token_usage` (0005) is a day total the Python API writes. |
| Hosting | Vercel (`vercel.json` crons), Node 24 locally | No `.github/workflows`: there is no CI today. `npm run build` runs vitest first. |
| Tests | Vitest 4, 52 files / 461 tests, ~1.3 s. No Playwright | Engine tests: `src/lib/feasibility/__tests__/far.test.ts`, `src/lib/__tests__/adu-analysis.test.ts`, `src/lib/site-envelope.test.ts`, `src/lib/tree-analysis.test.ts`, `src/lib/dadu-score.test.ts`. The 5519 12th Ave NE case is pinned in `study.test.ts` and `far.test.ts`. There are no file-based golden snapshots; the tests above are the golden set. |
| Copy guardrails | `src/lib/copy-guardrails.test.ts` greps `src/app`, `src/components`, `pricing.ts` for approval promises, certification wording | The seed of the content eval suite. |
| Content | `src/lib/case-studies.ts` (one real case study, figures from the owner), `rag/documents/*.md` (team guide, 36 = score rules), `prompts/agent.md` | |
| Env | `.env.local` (git-ignored), `.env.credentials.example` (names + how to get each key). No `.env.example` | `.env.credentials.example` is the documented template; new variables go there. |
| Other folders | `services/api` (Python FastAPI Pencil API, own LLM calls, own migrations), `apps/*`, `fde/`, `packages/schema` (zod report schema), `mcp/` | Out of scope for the web app's `llm_calls`; noted as a gap in §9. |

Core IP, do not regress: `src/lib/feasibility/far.ts`, `src/lib/adu-analysis.ts`, `src/lib/site-envelope.ts`,
`src/lib/tree-analysis.ts`, `src/lib/dadu-score.ts`, `src/lib/report/study.ts`, `src/components/report/MasterPlan.tsx`
(SVG master plan), `src/components/report/LotSection.tsx`, `src/lib/report-pdf/*`.

## 2. Admin (`/admin`)

**Exists:** `/admin` (pipeline board), `/admin/metrics`, `/admin/invest`, `/admin/referrals`, all behind
`requireViewer(..., ["admin"])` with Supabase sessions.

**Auth, as the brief asks:** credentials from `ADMIN_USER` + `ADMIN_PASSWORD_HASH` (bcrypt), checked at
`POST /api/admin/login` (Node runtime). On success, mint an HMAC-signed session cookie `pencil_admin`
(HttpOnly, Secure, SameSite=Strict, 12 h, key `ADMIN_SESSION_SECRET`). `proxy.ts` verifies the signature with
Web Crypto on every `/admin*` page and `/api/admin/*` route (matcher extended; no bcrypt in the proxy). Local
dev seeds `admin` / `admin#!$` only when `NODE_ENV !== "production"`; `src/instrumentation.ts` throws at boot in
production when the vars are missing or the hash matches the dev default.

- CSRF: double-submit token (`pencil_admin_csrf` cookie + `x-csrf-token` header), checked on every non-GET admin
  route. Server actions get the same check through a shared `assertAdminAction()`.
- Rate limit: 5 login attempts / 15 min / IP in the existing `rate_limits` table (works on Vercel; memory does not).
- Audit: `admin_audit_log` (actor, action, target table/id, environment, ip, meta, created_at). Every login,
  env switch, delete, restore, subscription cancel.
- `noindex`: admin layout `metadata.robots = { index: false, follow: false }`; new `src/app/robots.ts`
  disallows `/admin`, `/api`; new `src/app/sitemap.ts` lists public pages only.

**Decision needed (see §9 Q1):** the existing four admin pages read through the signed-in user's RLS client.
Under env-credential auth there is no Supabase user, so those pages switch to `supabaseAdmin()` (secret key),
which is what admin-only reads should use anyway. The `admin` Supabase role stays for the client portal's RLS
(an admin opening `/portal/projects/[id]`).

**Environment switcher:** the app talks to Supabase over HTTP, so "DB connection" means a Supabase project:
`SUPABASE_URL_LOCAL/_DEV/_PROD` + `SUPABASE_SECRET_KEY_LOCAL/_DEV/_PROD`. The choice lives in the admin session
cookie (never a query string). `adminDb()` returns the client for the active environment; Prod is read-only
unless the action passes a typed confirmation (the record's email or project address). A banner shows the
environment on every admin page (Prod = red). Local = `supabase start` (CLI config already in `supabase/config.toml`).

**Dashboard:** KPI tiles with inline-SVG sparklines (no chart library; `dataviz` skill palette), 7d / 30d / all
selector, charts for signups, MRR, LLM calls and cost by model and feature. Numbers come from SQL views added in
the migration (`admin_daily_signups`, `admin_daily_llm`, `admin_mrr`) so the page does one query each.

**Tables:** one server component `AdminTable` (search, filter, sort, paginate, CSV export via
`GET /api/admin/export?table=…`) over users, subscriptions, feasibility reports (`service_orders` + portal
`feasibility_reports`), projects, LLM calls (drill-in with PII redacted: emails, phone numbers, street
addresses outside the parcel address).

**Deletion:** soft delete (`deleted_at`) on `profiles` and `projects` with a 30-day restore; the modal chooses
cascade vs anonymize projects; hard delete is a second confirmed action that also calls
`auth.admin.deleteUser`. Deleting a subscriber cancels the Stripe subscription first. All audited.

## 3. LLM instrumentation

- `src/lib/ai/prices.ts`: the per-model price table (moved out of `usage.ts`; `costOf` reads it). One file to edit.
- `src/lib/ai/instrument.ts`: `instrumented(llm, { feature, userId })` wraps any `Llm` and records to `llm_calls`
  (timestamp, feature, model, prompt/completion/cache tokens, cost, latency ms, status, error, user id, prompt
  and response text for the drill-in). Writes are fire-and-forget with `supabaseAdmin()`; a failed write never
  fails the call. `llmFor()` gains a `feature` argument so all three call sites go through it; `scripts/eval.ts`
  tags `feature: "eval"`.
- `RunMeter` and `dailyBudget` stay as they are.

## 4. Monetization

| Product | Today | Plan |
|---|---|---|
| Free instant check (`/feasibility`) | free, the top-of-funnel hook | unchanged |
| Quick feasibility report $200 | `feasibility_instant`, $200, "delivered instantly", not human-reviewed; `feasibility_reviewed` $600 is the human-reviewed one | **Q2 in §9**: the brief says $200 *and* human-reviewed. Plan assumes the $200 product gains the review and the $600 tier is retired, pending your answer. |
| Newsletter $5/month | `signups` rows only, nothing sent | Stripe Checkout `mode: "subscription"`, Customer Portal link, webhooks `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid/payment_failed`. Idempotent by `stripe_event_id` unique column. Table `subscriptions`. |
| 1 free report / calendar month | nothing | `report_credits` ledger: one `+1` row per active subscriber per calendar month (granted by the invoice webhook, so it is tied to a real payment), one `-1` row per redemption, both with `period` = `YYYY-MM`. Balance = sum for the current period, non-rolling. Enforced in `/api/checkout` server-side. |

Stripe stays behind `PAYMENTS_PROVIDER=stripe`; the mock provider keeps working locally and in E2E. `stripeProvider.charge` is finished for the one-time products (Checkout, `mode: "payment"`, order marked paid by the webhook), which also closes the `TODO(payment)` in the checkout route.

## 5. Schema changes (migration `0011_admin_monetization.sql`, with `supabase/migrations/down/0011.sql`)

```
llm_calls          id, created_at, feature, model, provider, prompt_tokens, completion_tokens, cache_read_tokens,
                   cost_usd numeric(10,6), latency_ms, status (ok|error), error, user_id, prompt text, response text
admin_audit_log    id, created_at, actor, action, environment, target_table, target_id, ip, meta jsonb
subscriptions      id, user_id, email, stripe_customer_id, stripe_subscription_id unique, plan (newsletter),
                   status, current_period_start/end, cancel_at, created_at, updated_at
stripe_events      id (stripe event id, pk), type, received_at            -- idempotency
report_credits     id, user_id, period char(7), delta int, reason (grant|redeem|refund|admin), order_id, created_at
profiles           + deleted_at, + persona (investor|homeowner|null), + newsletter_only bool
projects           + deleted_at
views              admin_daily_signups, admin_daily_llm, admin_mrr
```
RLS on, no policies: only the secret key reads these. Seed: `scripts/seed-admin.ts` with faker-free, hand-written
fake rows (no real PII).

## 6. New routes

| Route | Purpose |
|---|---|
| `POST /api/admin/login`, `POST /api/admin/logout` | env-credential session |
| `POST /api/admin/env` | switch environment (audited) |
| `GET /api/admin/export` | CSV |
| `POST /api/admin/users/[id]/delete`, `/restore`, `/hard-delete`; `POST /api/admin/projects/[id]/delete` | deletion |
| `/admin/login`, `/admin/dashboard`, `/admin/users`, `/admin/subscriptions`, `/admin/reports`, `/admin/projects`, `/admin/llm`, `/admin/llm/[id]` | pages |
| `POST /api/subscribe/checkout`, `POST /api/subscribe/portal` | newsletter subscription + Customer Portal |
| `POST /api/stripe/webhook` | extended for subscriptions and one-time products |
| `/robots.ts`, `/sitemap.ts` | SEO, admin excluded |
| `/gallery` | case-study and deal gallery with filters (phase 6) |

## 7. New dependencies

| Package | Why | Alternative rejected |
|---|---|---|
| `bcryptjs` | verify `ADMIN_PASSWORD_HASH`; pure JS, no native build on Vercel | `argon2` needs a native binary |
| `@playwright/test` (dev) | the E2E flows the brief names; nothing in the repo does browser tests | Cypress: heavier, no reason to differ from the Next.js default |
| nothing else | charts are inline SVG; CSV, CSRF, rate limiting and HMAC cookies are a few lines over Node `crypto` and the existing `rate_limits` table; Stripe, Resend client (fetch), zod, Supabase are installed | `recharts`, `csurf`, `iron-session`: not needed |

CI: add `.github/workflows/ci.yml` (lint, `tsc --noEmit`, `vitest run`, `eval:content`, Playwright against the
mock provider). There is no CI today, so "fails the build" means this workflow plus `npm run build`.

## 8. Phase map

1. **Discovery + PLAN.md** — this file. Checkpoint.
2. **Schema + LLM instrumentation + admin auth** — migration 0011, `prices.ts`, `instrument.ts`, login, proxy guard, CSRF, rate limit, audit log, boot check, robots/sitemap, unit tests for auth and the ledger math.
3. **Admin dashboard, tables, env switcher, deletion** — pages above, SQL views, CSV export, integration tests for deletion.
4. **Payments, subscription, free-report entitlement** — Stripe subscription + one-time Checkout, webhooks with idempotency, ledger enforcement in checkout, Customer Portal, pricing shown on `/`, `/feasibility`, FAQ. Webhook integration tests with recorded Stripe payloads.
5. **Brand system** — `/impeccable` and `/frontend-design` skills, then `docs/BRAND.md` (palette from the existing tokens, type scale, spacing, motion with `prefers-reduced-motion`, icons, imagery), then the shared components (`pa-*` classes in `site.css`).
6. **Page rebuilds** — hero as given, about section (roster, honesty line, 5-step Find/Check/Design/Permit/Build), gallery, persona switch (cookie, no gate), newsletter placements after case study / result / gallery end, footer disclaimer + brokerage name (`{{TODO}}` until supplied), WAC 308-124B-210 check.
7. **Content eval suite** — `scripts/eval-content.ts` (`npm run eval:content`): string inventory snapshot, `content/claims.json` registry (every price, timeline, percentage, SMC section with a source), fluff linter (40-word blocks, banned phrases, outcome guarantees), LLM output golden cases + judge (reuses `evals/golden.json` and `scripts/eval.ts`'s judge tier), SMC citation check. Absorbs `copy-guardrails.test.ts`. Fix every violation it finds.
8. **Final QA** — Lighthouse ≥ 95 on public pages, axe pass, Playwright suite, security review of `/admin` (headers, cookie flags, CSRF, rate limit, prod guard).

Each phase is one or more small commits on local `main` (never pushed from here), engine tests green at every commit.

## 9. Risks and open questions

**Q1. Admin auth model.** The brief wants env credentials; the app has Supabase-role admins with RLS-scoped
reads. Recommendation above: env credentials gate `/admin`, admin pages read with the secret key, the Supabase
`admin` role stays for the client portal. Confirm, or say if admins must also be Supabase users (then the env
login becomes a step-up on top of the Supabase session).

**Q2. "$200 one-time, human-reviewed."** Today $200 is instant and $600 is reviewed. Options: (a) $200 becomes
the reviewed product and $600 is retired; (b) keep both, and the free monthly report is the $200 instant one.
Plan assumes (a) until you say otherwise.

**Q3. Dev environment.** `supabase/README.md` names one project (prod). Does a Dev project exist? If not, the
switcher ships with Local and Prod and a greyed-out Dev until `SUPABASE_URL_DEV` is set.

**Q4. Brokerage name.** Commit `fe5cae7` removed "broker/realtor" references. If Pencil advertises brokerage
services (the roster lists real estate agents; `projects.brokerage_fee_cents` exists), WAC 308-124B-210 needs the
licensed firm name on those pages. I will use `{{TODO: licensed brokerage name}}` and a footer disclaimer.

**Q5. Newsletter content.** "Weekly Seattle DADU deals" needs a sender and a template. Phase 4 ships the
subscription and the ledger; the weekly send itself (Resend broadcast from the search map's top lots) is a
follow-up unless you want it in scope.

**Risks**
- Another session edits this checkout (`src/app/page.tsx`, `src/app/site.css`, `src/components/site/Journey.tsx`
  are uncommitted and not mine). Phases 5–6 touch the same files; I will coordinate before editing them.
- Supabase applies `supabase/migrations/*` to prod on merge to `main`. 0011 is additive and idempotent; the
  `down` file is for manual rollback.
- `proxy.ts` currently skips `/api/*`; extending the matcher to `/api/admin/*` must not slow public routes
  (signature check only, no network).
- Vercel functions are stateless: rate limits and idempotency live in Postgres, not memory.
- Lighthouse 95 on the report page is at risk from MapLibre and the SVG plan; the target applies to public
  marketing pages first.
- `data/lot-library.json` still carries scores from before the room rule (commit `fee8700`); `npm run build:lots`
  is pending and unrelated to this work.
