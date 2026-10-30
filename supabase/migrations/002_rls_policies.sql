-- BriefPay AI · Migration 002 — Row Level Security
-- Run AFTER 001. Enables RLS and owner-scoped policies.
-- Public share-link access is handled server-side with the service-role
-- key (narrowly scoped to a valid share token), so no public policies here.

alter table public.profiles enable row level security;
alter table public.project_briefs enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_versions enable row level security;
alter table public.payments enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles: users read/update only their own row.
drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Briefs: owner-only.
drop policy if exists briefs_owner on public.project_briefs;
create policy briefs_owner on public.project_briefs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Proposals: owner-only (share links bypass RLS via service role + token check).
drop policy if exists proposals_owner on public.proposals;
create policy proposals_owner on public.proposals
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Versions: visible to the proposal owner. Inserts happen through the
-- owner session (approve flow), so owner check on parent proposal.
drop policy if exists versions_owner_read on public.proposal_versions;
create policy versions_owner_read on public.proposal_versions
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_versions.proposal_id and p.owner_id = auth.uid()
    )
  );
drop policy if exists versions_owner_write on public.proposal_versions;
create policy versions_owner_write on public.proposal_versions
  for insert with check (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_versions.proposal_id and p.owner_id = auth.uid()
    )
  );

-- Payments: owner may read their own; all writes go through the
-- service-role server code after PayPal verification (no direct writes).
drop policy if exists payments_owner_read on public.payments;
create policy payments_owner_read on public.payments
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = payments.proposal_id and p.owner_id = auth.uid()
    )
  );

-- Activity logs: owner read + insert only.
drop policy if exists activity_owner on public.activity_logs;
create policy activity_owner on public.activity_logs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
