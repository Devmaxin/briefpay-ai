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
- Supabase Auth (`@supabase/ssr`, session refresh via `proxy.ts`) + Supabase PostgreSQL (RLS everywhere)
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
   - `supabase/migrations/002_rls_policies.sql` — initial RLS policies
   - `supabase/migrations/003_triggers.sql` — `updated_at` triggers, profile trigger, approval FK
   - `supabase/migrations/004_phase2_schema.sql` — profile/client fields, `final_price`, integrity FKs
   - `supabase/migrations/005_rls_hardening.sql` — final policies, safe profile trigger, grants
3. Enable **Email auth** under Authentication → Providers (magic links off is fine).
4. Copy the project URL + publishable key + service-role key into env vars.
5. **Verify RLS with two accounts** — see [Verifying RLS](#verifying-rls).

Key design points:

- `proposals` holds the editable draft; `proposal_versions` holds **immutable
  snapshots** of exactly what the client approved.
- `proposals.price` is the working/AI-suggested amount; `final_price` is frozen
  at approval and is what the dashboard shows. Checkout reads the version snapshot.
- `payments` is keyed by `paypal_order_id` (unique) — retries reconcile, never duplicate.
- RLS: owners see only their rows. Public share links use the service-role key
  **narrowly scoped to a valid 32-char token + approved/paid status** (`lib/share.ts`);
  no owner emails or unrelated rows are exposed.

## Authentication

Email + password, implemented with `@supabase/ssr` only (no deprecated helpers,
no duplicate clients):

| Client | File | Used by |
|---|---|---|
| Browser | `lib/supabase/client.ts` | signup, login, resend confirmation |
| Server (session cookies) | `lib/supabase/server.ts` | layouts, pages, route handlers |
| Service role | `lib/supabase/admin.ts` | share-link reads + verified payment writes only |

- **Signup** collects an optional display name (stored in user metadata, copied
  to `profiles.full_name` by the trigger). If the project requires email
  confirmation, the form switches to a "check your inbox" state with a resend
  action instead of pretending the user is signed in.
- **Login** maps Supabase errors to human copy, and sends the user to `next`
  (e.g. a deep link they were blocked from) after validating that it is an
  internal path — `safeNextPath()` blocks open redirects.
- **Logout** is a POST-only route (`/auth/signout`); the client redirects to
  `/login` and refreshes. GET cannot end a session.
- **Session refresh** happens in `proxy.ts` (Next 16's replacement for
  `middleware.ts`), which rotates cookies on every request and also blocks
  `/dashboard/*` for signed-out visitors. The dashboard layout repeats the
  check server-side against Supabase — the browser never supplies a user id.
- Signing in or up while already authenticated redirects to `/dashboard`; the
  redirect happens outside the `try` block so it is not swallowed.

### Supabase Auth settings required

1. **Authentication → Providers → Email**: enabled.
2. **Confirm email**: either setting works — the UI handles both.
3. **Authentication → URL Configuration**: set *Site URL* to your deployment
   (`http://localhost:3000` locally) and add
   `http://localhost:3000/login` (plus the production equivalent) to
   *Redirect URLs*, so confirmation links land back on the app.
4. No service-role key is needed in the browser. Only
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public.

## Row Level Security

RLS is enabled on all six tables. Policies are scoped with `auth.uid()`; there is
no `using (true)` anywhere, so a signed-out visitor and a signed-in stranger both
see nothing.

| Table | Client read | Client write | Notes |
|---|---|---|---|
| `profiles` | own row only | update presentation fields only | created by the `SECURITY DEFINER` trigger; `id`/`email` not writable by clients |
| `project_briefs` | own rows | insert/update/delete own | `with check` prevents creating rows under another account |
| `proposals` | own rows | insert/update/delete own | brief references are checked by a trigger |
| `proposal_versions` | via owned parent | insert via owned parent | no update/delete policies → snapshots are immutable |
| `payments` | via owned parent | none | written only by server code after PayPal verification |
| `activity_logs` | own rows | insert own | append-only |

Database-level integrity on top of RLS:

- `payments (version_id, proposal_id)` → `proposal_versions (id, proposal_id)`:
  a payment can only reference a version of its own proposal.
- `proposals (approved_version_id, id)` → `proposal_versions (id, proposal_id)`:
  the approved snapshot must belong to that proposal.
- `enforce_proposal_brief_owner` rejects proposals pointing at another account's brief.
- Trigger functions are `SECURITY DEFINER` with a pinned `search_path` and their
  `EXECUTE` privilege is revoked from `anon`/`authenticated`.

### Verifying RLS

`supabase/tests/rls_checks.sql` is a manual script (needs a live project and two
real accounts). It impersonates each user via `request.jwt.claims` and reports
PASS/FAIL for: cross-tenant reads, updates and deletes, inserting rows owned by
the other user, referencing another account's brief, direct payment writes,
immutable versions, and profile isolation. Replace the two UUIDs, paste into the
SQL editor, and read the notices. The script rolls back.

`tests/migrations.test.ts` additionally enforces these properties statically in
CI: RLS enabled per table, every policy scoped by `auth.uid()`, no client write
policy on `payments`, no update/delete policy on versions or logs, and the
composite foreign keys above.

## Dashboard

`/dashboard` is the freelancer workspace. It is server-rendered under RLS and
shows only real, persisted data:

- **Stats** — total proposals, open drafts, approved proposals awaiting payment,
  and **verified paid totals** summed from `payments.status = 'captured'` only
  (grouped by currency). PayPal orders that were created, pending, or failed are
  never counted as revenue. Zero records show zeros.
- **Recent proposals** — the 20 most recently updated, with client name (from the
  brief), amount (`final_price` once approved, otherwise `price`), status, last
  updated time, and a link to open the proposal. Search and status filters are
  client-side over those rows.
- **Errors** — a failed query renders an explicit error card / inline warning,
  never a silent zero or an empty state.
- **Empty state** — explains the next step and links to `/dashboard/new`.
- **Loading / error boundaries** — `app/dashboard/loading.tsx` and
  `app/dashboard/error.tsx`.

The sidebar only links to features that exist (Overview, New proposal), shows the
signed-in account, and sign-out. On mobile it collapses into a menu; the skip
link, focus rings, Escape-to-close, and 44px touch targets are in place.

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
npm test            # node --test "tests/*.test.ts" (no credentials needed)
npm run build       # production build
```

If the platform's native SWC binary is unavailable, use
`npm run build -- --webpack` / `npm run dev -- --webpack`.

Automated tests (68 assertions):

- `tests/validation.test.ts` — schema validation, AI payloads, share tokens,
  amount/currency tampering, payee mismatch, duplicate-capture idempotency.
- `tests/dashboard.test.ts` — status counts, final vs working price, verified
  totals exclude non-captured payments, per-currency grouping, zero states.
- `tests/auth.test.ts` — auth error copy, open-redirect protection, confirmation detection.
- `tests/identity.test.ts` — profile name/initial fallbacks.
- `tests/migrations.test.ts` — static RLS/schema guardrails (see above).

What the automated suite cannot cover without credentials: live signup/login,
cookie/session rotation, and Postgres RLS enforcement. Those are listed in the
manual checklist below.

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

## Manual verification checklist (needs a live Supabase project)

1. **Signup** at `/signup` with a new email → either lands on `/dashboard`
   (confirmation off) or shows "Check your inbox" (confirmation on).
2. **Invalid login** → "Incorrect email or password", no redirect.
3. **Valid login** → `/dashboard`, then hard-refresh → still signed in
   (session cookie rotated by `proxy.ts`).
4. **Protected deep link** while signed out → `/login?next=…`, and after signing
   in you land on the requested page, not the site root.
5. **Sign out** from the sidebar → `/login`; `/dashboard` redirects back to login.
6. **Empty dashboard** → zeros in all four stats and the "No proposals yet" state.
7. **Create a proposal** (add client + project name on the brief step) → it
   appears in "Recent proposals" with the client name and amount.
8. **Approve it** → total unchanged, "Awaiting payment" increments, amount uses
   the final price.
9. **RLS** → run `supabase/tests/rls_checks.sql` with two accounts; all notices
   should say PASS.
10. **Responsive** → desktop (≥1280px), tablet (~768px), mobile (390px): no
    horizontal scroll, sidebar collapses, rows stack, buttons stay tappable.

## Known limitations

- Sandbox only; no live payments, no webhooks (safe server-side reconciliation instead).
- Single freelancer accounts; no teams, no email notifications, no file uploads.
- One bounded AI repair retry; sustained provider outages surface as actionable errors.
- Demo-mode drafts are used when `GROQ_API_KEY` is missing, always labeled as such.
- Proposal editor uses line-based list editing (kept simple for the MVP).
- Dashboard lists the 20 most recently updated proposals; no pagination yet.
- Profile editing is not exposed as a UI yet — the name is captured at signup and
  `profiles.full_name` can be updated later under RLS. `avatar_url` exists but is unused.
- Password reset is not wired into the UI; use Supabase's recovery email for now.
- RLS enforcement requires a live project; the repo ships the SQL checks and
  static guardrails, not a substitute for running them.
