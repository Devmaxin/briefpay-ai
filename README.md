# BriefPay AI — From vague to paid

Turn vague client requests into structured proposals and verified PayPal payments.
Built for the PayPal AI Hackathon.

**Workflow:** freelancer signs in → pastes a vague request → Groq asks clarifying
questions → Groq drafts a structured proposal → freelancer edits & approves →
client opens a share link, accepts terms, and pays via **PayPal Sandbox** →
server verifies the capture → dashboard shows verified-paid.

> **Sandbox demo only.** No real money moves. BriefPay holds no funds, provides
> no escrow, guarantees no delivery, and AI pricing is advisory, not a guarantee.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS 4
- Supabase Auth (`@supabase/ssr`) + Supabase PostgreSQL (RLS everywhere)
- Groq Chat Completions API (server-only, schema-validated)
- PayPal Orders v2 REST API + PayPal JS SDK (`@paypal/paypal-js`), Sandbox only
- zod validation, lucide-react icons, Node built-in test runner

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in values (never commit .env.local)
npm run dev                  # http://localhost:3000
```

Without credentials, the app still runs: the brief wizard uses clearly-labeled
demo questions/drafts, and checkout shows a setup error instead of a fake success.
A fake success is never substituted.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel + `.env.local` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (secret) only | Server-only: share-link reads + payment writes |
| `GROQ_API_KEY` | Vercel (secret) + `.env.local` | Server-only Groq key |
| `GROQ_MODEL` | Vercel + `.env.local` | e.g. `llama-3.3-70b-versatile` (check console.groq.com/docs/models) |
| `PAYPAL_ENV` | Vercel + `.env.local` | Must be `sandbox` |
| `PAYPAL_CLIENT_ID` | Vercel (secret) + `.env.local` | Sandbox REST app client id |
| `PAYPAL_CLIENT_SECRET` | Vercel (secret) only | Server-only Sandbox secret |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Vercel + `.env.local` | Same as `PAYPAL_CLIENT_ID`, for the JS SDK |
| `PAYPAL_MERCHANT_EMAIL` | Vercel (optional) | Sandbox seller email, verified as payee on capture |

In Vercel: **Project → Settings → Environment Variables**. Mark
`SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `PAYPAL_CLIENT_SECRET` as
**Sensitive**. Redeploy after changing them.

## Database setup (Supabase SQL Editor)

1. Create a project at [supabase.com](https://supabase.com), then open
   **SQL Editor → New query**.
2. Run the migrations **in order**, pasting each file's contents:
   - `supabase/migrations/001_core_tables.sql` — tables + indexes + constraints
   - `supabase/migrations/002_rls_policies.sql` — RLS + owner-scoped policies
   - `supabase/migrations/003_triggers.sql` — `updated_at` triggers, profile trigger, approval FK
3. Enable **Email auth** under Authentication → Providers (magic links off is fine).
4. Copy the project URL + publishable key + service-role key into env vars.

Key design points:

- `proposals` holds the editable draft; `proposal_versions` holds **immutable
  snapshots** of exactly what the client approved.
- `payments` is keyed by `paypal_order_id` (unique) — retries reconcile, never duplicate.
- RLS: owners see only their rows. Public share links use the service-role key
  **narrowly scoped to a valid 32-char token + approved/paid status** (`lib/share.ts`);
  no owner emails or unrelated rows are exposed.

## PayPal Sandbox testing

1. Create a Sandbox business (seller) + personal (buyer) account at
   [developer.paypal.com](https://developer.paypal.com) → Testing Tools.
2. Create a REST app for the seller account; copy client id + secret.
3. Set `PAYPAL_MERCHANT_EMAIL` to the seller's Sandbox email (enables payee check).
4. End-to-end: sign in → New proposal → approve → copy `/p/<token>` link →
   open in an incognito window → tick acceptance → pay with the buyer account →
   confirm the freelancer dashboard flips to **paid** (server-verified, not the redirect).

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # node --test tests/ (no credentials needed)
npm run build       # production build
```

Tests cover: schema validation, invalid AI payloads, share-token validation,
amount/currency tampering, payee mismatch, duplicate-capture idempotency, and
payment status transitions.

## Hackathon demo script (≈5 min)

1. **Hook (30s):** “Freelancers lose deals to vague scope. Watch a rambling
   bakery email become verified money.”
2. **Brief (60s):** paste the example request on `/dashboard/new`; show the AI
   questions and answer two, skip one.
3. **Draft (60s):** generate; point out deliverables, exclusions, advisory price
   label; tweak the price live.
4. **Approve (45s):** approve, copy the `/p/<token>` link; open it incognito —
   “this is exactly what the client sees.”
5. **Pay (90s):** tick acceptance, pay with the Sandbox buyer; narrate
   “server creates the order from the database price… captures… verifies
   amount, currency, payee… dashboard flips to paid.”
6. **Trust close (30s):** edit the approved proposal → approval invalidates;
   retry capture → idempotent. “No redirect ever counts as proof.”

## Known limitations

- Sandbox only; no live payments, no webhooks (safe server-side reconciliation instead).
- Single freelancer accounts; no teams, no email notifications, no file uploads.
- One bounded AI repair retry; sustained provider outages surface as actionable errors.
- Demo-mode drafts are used when `GROQ_API_KEY` is missing, always labeled as such.
- Proposal editor uses line-based list editing (kept simple for the MVP).
- No pagination beyond 50 dashboard rows; no full-text search (status filter is client-side simple list).
