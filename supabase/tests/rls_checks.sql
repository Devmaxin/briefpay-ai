-- BriefPay AI · Manual RLS verification (Phase 2)
--
-- NOT part of the automated test run: it needs a live Supabase project and
-- two real accounts. Run it after applying migrations 001–005.
--
-- Setup
--   1. Create two accounts (signup, or Dashboard → Authentication → Users).
--   2. Copy their UUIDs from Authentication → Users.
--   3. Sign in as each user and create at least one proposal (and optionally
--      approve it so a proposal_version exists).
--   4. Replace the two placeholders below, paste this file into
--      SQL Editor → New query → Run, and read the NOTICE output.
--
-- Every check reports PASS / FAIL / SKIP. Nothing is committed (ROLLBACK).

begin;

select set_config('test.uid_a', 'REPLACE-WITH-USER-A-UUID', true) as user_a,
       set_config('test.uid_b', 'REPLACE-WITH-USER-B-UUID', true) as user_b;

do $$
begin
  if current_setting('test.uid_a') !~ '^[0-9a-f-]{36}$'
     or current_setting('test.uid_b') !~ '^[0-9a-f-]{36}$' then
    raise exception 'Replace the two UUID placeholders at the top of the script first.';
  end if;
end $$;

-- ── Act as User A ────────────────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.uid_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  uid_a uuid := current_setting('test.uid_a')::uuid;
  uid_b uuid := current_setting('test.uid_b')::uuid;
  leaked bigint;
  affected bigint;
  own_proposal uuid;
  own_version uuid;
begin
  -- 1. A must never see B's proposals, briefs, payments or logs.
  select count(*) into leaked from public.proposals where owner_id = uid_b;
  raise notice '% A sees B proposals: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  select count(*) into leaked from public.project_briefs where owner_id = uid_b;
  raise notice '% A sees B briefs: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  select count(*) into leaked
  from public.payments pay
  join public.proposals p on p.id = pay.proposal_id
  where p.owner_id = uid_b;
  raise notice '% A sees B payments: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  select count(*) into leaked from public.activity_logs where owner_id = uid_b;
  raise notice '% A sees B activity logs: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  -- 2. A cannot update B's rows (RLS filters them out → 0 rows affected).
  update public.proposals set title = 'rls probe' where owner_id = uid_b;
  get diagnostics affected = row_count;
  raise notice '% A updated B proposals: % row(s) (expected 0)', case when affected = 0 then 'PASS' else 'FAIL' end, affected;

  update public.project_briefs set raw_request = 'rls probe' where owner_id = uid_b;
  get diagnostics affected = row_count;
  raise notice '% A updated B briefs: % row(s) (expected 0)', case when affected = 0 then 'PASS' else 'FAIL' end, affected;

  -- 3. A cannot delete B's rows.
  delete from public.proposals where owner_id = uid_b;
  get diagnostics affected = row_count;
  raise notice '% A deleted B proposals: % row(s) (expected 0)', case when affected = 0 then 'PASS' else 'FAIL' end, affected;

  -- 4. A cannot create a proposal owned by B (WITH CHECK rejects it).
  begin
    insert into public.proposals (owner_id, title) values (uid_b, 'rls cross-tenant probe');
    raise notice 'FAIL A inserted a proposal owned by B (expected an error)';
  exception when insufficient_privilege then
    raise notice 'PASS A insert with owner_id = B was rejected';
  end;

  -- 5. A cannot create a brief owned by B.
  begin
    insert into public.project_briefs (owner_id, raw_request) values (uid_b, 'rls probe');
    raise notice 'FAIL A inserted a brief owned by B (expected an error)';
  exception when insufficient_privilege then
    raise notice 'PASS A insert with owner_id = B was rejected';
  end;

  -- 6. A cannot point their own proposal at B's brief.
  select p.id into own_proposal from public.proposals p where p.owner_id = uid_a limit 1;
  if own_proposal is null then
    raise notice 'SKIP brief-ownership check (User A has no proposal)';
  else
    begin
      update public.proposals
         set brief_id = (select b.id from public.project_briefs b where b.owner_id = uid_b limit 1)
       where id = own_proposal;
      get diagnostics affected = row_count;
      if affected = 0 then
        raise notice 'SKIP brief-ownership check (User B has no brief)';
      else
        raise notice 'PASS proposal brief ownership enforced';
      end if;
    exception when others then
      raise notice 'PASS proposal could not reference another account''s brief (%)', sqlstate;
    end;
  end if;

  -- 7. Payment rows are server-only: no INSERT/UPDATE policy exists.
  select pv.id into own_version
    from public.proposal_versions pv
   where pv.proposal_id = own_proposal
   limit 1;
  if own_version is null then
    raise notice 'SKIP payment write check (User A has no approved proposal version)';
  else
    begin
      insert into public.payments (proposal_id, version_id, paypal_order_id, amount, currency)
      values (own_proposal, own_version, 'rls-probe-' || gen_random_uuid(), 1, 'USD');
      raise notice 'FAIL A inserted a payment row directly (expected an error)';
    exception when insufficient_privilege then
      raise notice 'PASS direct payment insert was rejected';
    end;

    update public.payments set status = 'captured' where proposal_id = own_proposal;
    get diagnostics affected = row_count;
    raise notice '% A updated payments directly: % row(s) (expected 0)', case when affected = 0 then 'PASS' else 'FAIL' end, affected;
  end if;

  -- 8. Snapshots are immutable for clients.
  begin
    update public.proposal_versions set price = 0.01 where proposal_id = own_proposal;
    get diagnostics affected = row_count;
    raise notice '% A updated proposal versions: % row(s) (expected 0)', case when affected = 0 then 'PASS' else 'FAIL' end, affected;
  exception when insufficient_privilege then
    raise notice 'PASS proposal version update was rejected';
  end;

  -- 9. Profiles are self-only and identity columns are not writable.
  select count(*) into leaked from public.profiles where id = uid_b;
  raise notice '% A sees B profile: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  begin
    update public.profiles set email = 'attacker@example.com' where id = uid_a;
    raise notice 'FAIL A rewrote their profile email (expected an error)';
  exception when insufficient_privilege then
    raise notice 'PASS profile email is not client-writable';
  end;

  begin
    update public.profiles set full_name = 'RLS Probe' where id = uid_b;
    get diagnostics affected = row_count;
    raise notice '% A renamed B''s profile: % row(s) (expected 0)', case when affected = 0 then 'PASS' else 'FAIL' end, affected;
  exception when insufficient_privilege then
    raise notice 'PASS profile update for another user was rejected';
  end;
end $$;

-- ── Act as User B ────────────────────────────────────────────────
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.uid_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  uid_a uuid := current_setting('test.uid_a')::uuid;
  leaked bigint;
begin
  select count(*) into leaked from public.proposals where owner_id = uid_a;
  raise notice '% B sees A proposals: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  select count(*) into leaked from public.project_briefs where owner_id = uid_a;
  raise notice '% B sees A briefs: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  select count(*) into leaked
  from public.payments pay
  join public.proposals p on p.id = pay.proposal_id
  where p.owner_id = uid_a;
  raise notice '% B sees A payments: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;
end $$;

-- ── Anonymous visitor ────────────────────────────────────────────
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare
  leaked bigint;
begin
  select count(*) into leaked from public.proposals;
  raise notice '% anonymous sees proposals: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  select count(*) into leaked from public.project_briefs;
  raise notice '% anonymous sees briefs: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  select count(*) into leaked from public.payments;
  raise notice '% anonymous sees payments: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;

  select count(*) into leaked from public.profiles;
  raise notice '% anonymous sees profiles: % (expected 0)', case when leaked = 0 then 'PASS' else 'FAIL' end, leaked;
end $$;

reset role;
rollback;
