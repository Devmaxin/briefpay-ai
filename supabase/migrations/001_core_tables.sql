-- BriefPay AI · Migration 001 — core tables
-- Apply via Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Run migrations in order (001, 002, 003).

-- Profiles: one row per authenticated freelancer.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Raw client requests + AI clarifying Q&A.
create table if not exists public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  raw_request text not null check (char_length(raw_request) between 1 and 4000),
  project_type text check (char_length(project_type) <= 80),
  currency char(3) not null default 'USD',
  questions jsonb,
  answers jsonb,
  status text not null default 'new' check (status in ('new', 'questions', 'drafted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_briefs_owner_idx on public.project_briefs (owner_id, created_at desc);

-- Freelancer-owned proposals (mutable draft until approved).
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  brief_id uuid references public.project_briefs (id) on delete set null,
  title text not null check (char_length(title) between 4 and 140),
  summary text not null default '',
  assumptions jsonb not null default '[]'::jsonb,
  deliverables jsonb not null default '[]'::jsonb,
  milestones jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  estimated_timeline text not null default '',
  price numeric(12, 2) not null default 0 check (price >= 0),
  currency char(3) not null default 'USD',
  revision_policy text not null default '',
  unresolved jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid')),
  share_token text unique check (share_token is null or char_length(share_token) = 32),
  approved_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proposals_owner_idx on public.proposals (owner_id, updated_at desc);
create index if not exists proposals_status_idx on public.proposals (owner_id, status);

-- Immutable snapshots: exactly what the client approved / paid for.
create table if not exists public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  snapshot jsonb not null,
  price numeric(12, 2) not null check (price > 0),
  currency char(3) not null,
  created_at timestamptz not null default now(),
  unique (proposal_id, version_number)
);
create index if not exists proposal_versions_proposal_idx
  on public.proposal_versions (proposal_id, version_number desc);

-- Verified payments, one row per PayPal order (idempotent on order id).
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete restrict,
  version_id uuid not null references public.proposal_versions (id) on delete restrict,
  paypal_order_id text not null unique,
  paypal_capture_id text unique,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null,
  status text not null default 'created'
    check (status in ('created', 'captured', 'pending', 'failed', 'canceled', 'superseded')),
  payer_email text,
  request_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_proposal_idx on public.payments (proposal_id, created_at desc);

-- Optional audit trail.
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  proposal_id uuid references public.proposals (id) on delete cascade,
  event text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_owner_idx on public.activity_logs (owner_id, created_at desc);
