-- BriefPay AI · Migration 004 — Phase 2 schema additions
-- Apply AFTER 003. Purely additive: existing rows and columns are preserved.
-- Safe to re-run (all statements are guarded).

-- ─────────────────────────────────────────────────────────────
-- profiles: the fields the dashboard personalises with.
-- `display_name` is kept for backwards compatibility; `full_name` is
-- the canonical value (backfilled below).
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text;

update public.profiles
set full_name = nullif(btrim(display_name), '')
where full_name is null
  and display_name is not null;

alter table public.profiles
  drop constraint if exists profiles_full_name_len,
  add constraint profiles_full_name_len
    check (full_name is null or char_length(full_name) between 1 and 80),
  drop constraint if exists profiles_avatar_url_len,
  add constraint profiles_avatar_url_len
    check (avatar_url is null or char_length(avatar_url) <= 500);

-- ─────────────────────────────────────────────────────────────
-- project_briefs: captured client/project identity for the dashboard.
-- ─────────────────────────────────────────────────────────────
alter table public.project_briefs
  add column if not exists project_name text,
  add column if not exists client_name text;

alter table public.project_briefs
  drop constraint if exists briefs_project_name_len,
  add constraint briefs_project_name_len
    check (project_name is null or char_length(project_name) between 1 and 140),
  drop constraint if exists briefs_client_name_len,
  add constraint briefs_client_name_len
    check (client_name is null or char_length(client_name) between 1 and 120);

-- ─────────────────────────────────────────────────────────────
-- proposals: `price` stays the working/AI-suggested amount.
-- `final_price` records the amount at approval (what the client is
-- actually asked to pay). Checkout still reads the immutable
-- proposal_versions.price snapshot.
-- ─────────────────────────────────────────────────────────────
alter table public.proposals
  add column if not exists final_price numeric(12, 2);

update public.proposals
set final_price = price
where final_price is null
  and status in ('approved', 'paid');

alter table public.proposals
  drop constraint if exists proposals_final_price_nonneg,
  add constraint proposals_final_price_nonneg
    check (final_price is null or final_price >= 0);

-- ─────────────────────────────────────────────────────────────
-- payments: a payment must point at a version of *its own* proposal.
-- Composite FK makes that structurally impossible to violate, instead
-- of relying on application code.
-- ─────────────────────────────────────────────────────────────
create unique index if not exists proposal_versions_id_proposal_key
  on public.proposal_versions (id, proposal_id);

alter table public.payments
  drop constraint if exists payments_version_id_fkey;

alter table public.payments
  drop constraint if exists payments_version_proposal_fk,
  add constraint payments_version_proposal_fk
    foreign key (version_id, proposal_id)
    references public.proposal_versions (id, proposal_id)
    on delete restrict;

-- Fast owner-scoped aggregate for the dashboard "verified paid" KPI.
create index if not exists payments_captured_currency_idx
  on public.payments (currency)
  where status = 'captured';

-- ─────────────────────────────────────────────────────────────
-- proposals.brief_id must belong to the same owner. The plain FK only
-- guards existence, so a malicious client could point their proposal at
-- someone else's brief id. Runs as the caller: under RLS the lookup for
-- another user's brief returns no row, so the write is rejected.
-- ─────────────────────────────────────────────────────────────
create or replace function public.enforce_proposal_brief_owner()
returns trigger
language plpgsql
as $$
begin
  if new.brief_id is not null and not exists (
    select 1
    from public.project_briefs b
    where b.id = new.brief_id
      and b.owner_id = new.owner_id
  ) then
    raise exception 'A proposal can only reference a brief owned by the same account.'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists proposals_brief_owner_check on public.proposals;
create trigger proposals_brief_owner_check
  before insert or update of brief_id, owner_id on public.proposals
  for each row execute function public.enforce_proposal_brief_owner();
