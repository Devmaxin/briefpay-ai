-- BriefPay AI · Migration 007 — Client acceptance + link revocation
-- Apply AFTER 006. Purely additive: existing rows and columns are preserved.
-- Safe to re-run (all statements are guarded).

-- Record client acceptances of approved proposal versions.
-- One row per acceptance event; the freelancer can see when a client
-- accepted which version and under what terms.
create table if not exists public.proposal_acceptances (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  version_id uuid not null references public.proposal_versions (id) on delete restrict,
  accepted_at timestamptz not null default now(),
  client_name text check (client_name is null or char_length(client_name) between 1 and 140),
  client_email text check (client_email is null or char_length(client_email) <= 254),
  terms_agreed boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists proposal_acceptances_proposal_idx
  on public.proposal_acceptances (proposal_id, accepted_at desc);

-- Track when a proposal's share link has been revoked by the freelancer.
-- Setting share_token = NULL would lose the token; instead we timestamp
-- the revocation so the public page can show a clear "link revoked" state.
alter table public.proposals
  add column if not exists revoked_at timestamptz;

-- Acceptance timestamp frozen at the moment the client accepts.
alter table public.proposals
  add column if not exists accepted_at timestamptz;

-- RLS: acceptances are readable by the proposal owner only; the public
-- acceptance endpoint writes via the service-role key after validating
-- the share token, so no client INSERT policy is needed here.
alter table public.proposal_acceptances enable row level security;

drop policy if exists acceptances_select_own on public.proposal_acceptances;
create policy acceptances_select_own on public.proposal_acceptances
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_acceptances.proposal_id
        and p.owner_id = auth.uid()
    )
  );

-- Revoke a share link: set revoked_at. The token stays in place but the
-- public page refuses to render the proposal once revoked_at is set.
-- No client-write policy exists; revocation is done through an
-- authenticated API route that validates ownership first.
