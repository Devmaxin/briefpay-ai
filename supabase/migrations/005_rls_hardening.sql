-- BriefPay AI · Migration 005 — RLS hardening + safe profile trigger
-- Apply AFTER 004. Replaces the Phase-1 policies with a stricter set.
-- Safe to re-run: every policy is dropped before being recreated.

alter table public.profiles enable row level security;
alter table public.project_briefs enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_versions enable row level security;
alter table public.payments enable row level security;
alter table public.activity_logs enable row level security;

-- ─────────────────────────────────────────────────────────────
-- profiles — a user reads/edits only their own row.
-- Rows are created exclusively by the auth trigger below (SECURITY
-- DEFINER), never by a client. No client INSERT/DELETE policy exists,
-- so those statements are denied by RLS.
-- ─────────────────────────────────────────────────────────────
drop policy if exists profiles_owner on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Defence in depth: the owner can edit presentation fields, but never
-- rewrite their auth identity (id/email) through PostgREST.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, display_name, avatar_url) on public.profiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- project_briefs — owner-only on every verb.
-- ─────────────────────────────────────────────────────────────
drop policy if exists briefs_owner on public.project_briefs;
drop policy if exists briefs_select_own on public.project_briefs;
drop policy if exists briefs_insert_own on public.project_briefs;
drop policy if exists briefs_update_own on public.project_briefs;
drop policy if exists briefs_delete_own on public.project_briefs;

create policy briefs_select_own on public.project_briefs
  for select using (auth.uid() = owner_id);
create policy briefs_insert_own on public.project_briefs
  for insert with check (auth.uid() = owner_id);
create policy briefs_update_own on public.project_briefs
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy briefs_delete_own on public.project_briefs
  for delete using (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────
-- proposals — owner-only on every verb.
-- ─────────────────────────────────────────────────────────────
drop policy if exists proposals_owner on public.proposals;
drop policy if exists proposals_select_own on public.proposals;
drop policy if exists proposals_insert_own on public.proposals;
drop policy if exists proposals_update_own on public.proposals;
drop policy if exists proposals_delete_own on public.proposals;

create policy proposals_select_own on public.proposals
  for select using (auth.uid() = owner_id);
create policy proposals_insert_own on public.proposals
  for insert with check (auth.uid() = owner_id);
create policy proposals_update_own on public.proposals
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy proposals_delete_own on public.proposals
  for delete using (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────
-- proposal_versions — readable/appendable only through an owned
-- parent proposal. Snapshots are immutable: no UPDATE/DELETE policy,
-- so clients cannot rewrite what a client approved.
-- ─────────────────────────────────────────────────────────────
drop policy if exists versions_owner_read on public.proposal_versions;
drop policy if exists versions_owner_write on public.proposal_versions;
drop policy if exists versions_select_own on public.proposal_versions;
drop policy if exists versions_insert_own on public.proposal_versions;

create policy versions_select_own on public.proposal_versions
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_versions.proposal_id
        and p.owner_id = auth.uid()
    )
  );

create policy versions_insert_own on public.proposal_versions
  for insert with check (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_versions.proposal_id
        and p.owner_id = auth.uid()
    )
  );

-- approved_version_id must point at a version of the *same* proposal,
-- not just at any version id. Existing rows are not revalidated.
alter table public.proposals
  drop constraint if exists proposals_approved_version_fk,
  drop constraint if exists proposals_approved_version_same_proposal_fk,
  add constraint proposals_approved_version_same_proposal_fk
    foreign key (approved_version_id, id)
    references public.proposal_versions (id, proposal_id)
    on delete no action
    not valid;

-- ─────────────────────────────────────────────────────────────
-- payments — owners may read their own payments and nothing else.
-- There is intentionally no INSERT/UPDATE/DELETE policy: payment rows
-- are written only by server code holding the service-role key after a
-- PayPal capture has been verified. RLS denies direct client writes.
-- ─────────────────────────────────────────────────────────────
drop policy if exists payments_owner_read on public.payments;
drop policy if exists payments_select_own on public.payments;

create policy payments_select_own on public.payments
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = payments.proposal_id
        and p.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- activity_logs — the owner can read and append; logs are immutable.
-- ─────────────────────────────────────────────────────────────
drop policy if exists activity_owner on public.activity_logs;
drop policy if exists activity_select_own on public.activity_logs;
drop policy if exists activity_insert_own on public.activity_logs;

create policy activity_select_own on public.activity_logs
  for select using (auth.uid() = owner_id);
create policy activity_insert_own on public.activity_logs
  for insert with check (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────
-- Profile bootstrap: copy the optional signup name into the profile.
-- SECURITY DEFINER is required to insert into public.profiles from the
-- auth schema. search_path is pinned; EXECUTE is revoked from clients.
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger functions are not callable as RPCs, but revoke anyway so the
-- privileged function can never be invoked directly by a client.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.enforce_proposal_brief_owner() from public, anon, authenticated;
