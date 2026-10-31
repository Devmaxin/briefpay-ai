-- BriefPay AI · Migration 006 — Proposal version tracking
-- Apply AFTER 005. Purely additive: existing rows and columns are preserved.
-- Safe to re-run (all statements are guarded).

-- Track the origin of each version snapshot so the editor can surface
-- AI-suggested content vs freelancer edits.
alter table public.proposal_versions
  add column if not exists source text,
  add column if not exists change_summary text;

alter table public.proposal_versions
  drop constraint if exists proposal_versions_source_check,
  add constraint proposal_versions_source_check
    check (source is null or source in ('ai', 'user'));

-- Index for fetching a proposal's version history quickly.
create index if not exists proposal_versions_source_idx
  on public.proposal_versions (proposal_id, version_number desc);

-- RLS: versions already inherit owner-scoped access via the parent proposal.
-- The existing policies (versions_select_own, versions_insert_own) cover
-- reads and writes through an owned proposal; no additional grants needed.
-- `source` and `change_summary` are written only by server code.
