-- BriefPay AI · Migration 003 — timestamps, approval link, profile trigger
-- Run AFTER 002.

-- Auto-update updated_at on owner-edited tables.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists briefs_touch on public.project_briefs;
create trigger briefs_touch before update on public.project_briefs
  for each row execute function public.touch_updated_at();

drop trigger if exists proposals_touch on public.proposals;
create trigger proposals_touch before update on public.proposals
  for each row execute function public.touch_updated_at();

drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

-- Link the approved snapshot back to the proposal (added after RLS so the
-- column exists for PostgREST; no data migration needed).
alter table public.proposals
  add constraint proposals_approved_version_fk
  foreign key (approved_version_id)
  references public.proposal_versions (id)
  on delete set null
  not valid;

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
