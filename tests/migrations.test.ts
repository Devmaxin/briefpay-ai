/**
 * Static RLS / schema guardrails.
 *
 * These tests read the SQL migrations and assert the security properties
 * that must hold. They do NOT prove Postgres enforces them — that requires
 * a live project and two accounts (see supabase/tests/rls_checks.sql).
 * They do fail loudly if a migration silently drops a policy or opens a
 * table to every authenticated user.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const MIGRATIONS = [
  "001_core_tables.sql",
  "002_rls_policies.sql",
  "003_triggers.sql",
  "004_phase2_schema.sql",
  "005_rls_hardening.sql",
] as const;

const sql = MIGRATIONS.map((file) =>
  readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"),
).join("\n");

const flat = sql.replace(/\s+/g, " ");

// Policies are asserted against the final hardening migration; earlier
// migrations may create policies that 005 intentionally replaces.
const policySql = readFileSync(
  new URL("../supabase/migrations/005_rls_hardening.sql", import.meta.url),
  "utf8",
);
const policyFlat = policySql.replace(/\s+/g, " ");

const USER_TABLES = [
  "profiles",
  "project_briefs",
  "proposals",
  "proposal_versions",
  "payments",
  "activity_logs",
] as const;

/** Policies created by the final hardening migration. */
function policiesFor(table: string): string[] {
  const pattern = new RegExp(
    `create policy \\w+ on public\\.${table}[\\s\\S]*?;`,
    "gi",
  );
  return policySql.match(pattern) ?? [];
}

describe("row level security is enabled everywhere", () => {
  for (const table of USER_TABLES) {
    it(`${table} has RLS enabled`, () => {
      assert.match(
        flat,
        new RegExp(`alter table public\\.${table} enable row level security;`),
      );
    });

    it(`${table} has at least one scoped policy`, () => {
      const policies = policiesFor(table);
      assert.ok(policies.length > 0, `no policies found for ${table}`);
      for (const policy of policies) {
        const body = policy.replace(/\s+/g, " ");
        assert.match(
          body,
          /auth\.uid\(\)/,
          `policy on ${table} must scope by auth.uid(): ${body}`,
        );
        assert.doesNotMatch(body, /using \(true\)/);
        assert.doesNotMatch(body, /with check \(true\)/);
      }
    });
  }
});

describe("ownership is enforced on writes", () => {
  it("brief inserts must be owned by the caller", () => {
    assert.match(
      flat,
      /create policy briefs_insert_own on public\.project_briefs for insert with check \(auth\.uid\(\) = owner_id\);/,
    );
  });

  it("proposal inserts and updates must be owned by the caller", () => {
    assert.match(
      flat,
      /create policy proposals_insert_own on public\.proposals for insert with check \(auth\.uid\(\) = owner_id\);/,
    );
    assert.match(
      flat,
      /create policy proposals_update_own on public\.proposals for update using \(auth\.uid\(\) = owner_id\) with check \(auth\.uid\(\) = owner_id\);/,
    );
  });

  it("versions and payments are authorised through the parent proposal", () => {
    assert.match(
      flat,
      /create policy versions_insert_own on public\.proposal_versions for insert with check \( exists \( select 1 from public\.proposals p where p\.id = proposal_versions\.proposal_id and p\.owner_id = auth\.uid\(\) \)/,
    );
    assert.match(
      flat,
      /create policy payments_select_own on public\.payments for select using \( exists \( select 1 from public\.proposals p where p\.id = payments\.proposal_id and p\.owner_id = auth\.uid\(\) \)/,
    );
  });
});

describe("sensitive tables are read-only for clients", () => {
  it("payments have no client write policy", () => {
    const policies = policiesFor("payments");
    assert.ok(policies.length > 0);
    for (const policy of policies) {
      assert.match(policy.replace(/\s+/g, " "), / for select /);
    }
  });

  it("proposal versions cannot be updated or deleted by clients", () => {
    for (const policy of policiesFor("proposal_versions")) {
      assert.doesNotMatch(policy, / for update /);
      assert.doesNotMatch(policy, / for delete /);
    }
  });

  it("activity logs are append-only for clients", () => {
    for (const policy of policiesFor("activity_logs")) {
      assert.doesNotMatch(policy, / for update /);
      assert.doesNotMatch(policy, / for delete /);
    }
  });

  it("profiles are self-only and not client-insertable", () => {
    assert.match(policyFlat, /create policy profiles_select_own on public\.profiles for select using \(auth\.uid\(\) = id\);/);
    assert.doesNotMatch(policyFlat, /create policy \w+ on public\.profiles for insert/);
    assert.doesNotMatch(policyFlat, /create policy \w+ on public\.profiles for delete/);
  });
});

describe("relational integrity", () => {
  it("a payment version must belong to the payment's proposal", () => {
    assert.match(
      flat,
      /foreign key \(version_id, proposal_id\) references public\.proposal_versions \(id, proposal_id\)/,
    );
  });

  it("an approved version must belong to the same proposal", () => {
    assert.match(
      flat,
      /foreign key \(approved_version_id, id\) references public\.proposal_versions \(id, proposal_id\)/,
    );
  });

  it("proposals cannot reference another account's brief", () => {
    assert.match(flat, /create trigger proposals_brief_owner_check/);
    assert.match(flat, /function public\.enforce_proposal_brief_owner/);
  });

  it("payments are idempotent on the provider order id", () => {
    assert.match(flat, /paypal_order_id text not null unique/);
  });
});

describe("the profile trigger is privileged but locked down", () => {
  it("runs as definer with a pinned search_path", () => {
    assert.match(flat, /create or replace function public\.handle_new_user\(\) returns trigger language plpgsql security definer set search_path = public as \$\$/);
  });

  it("cannot be executed directly by clients", () => {
    assert.match(
      flat,
      /revoke execute on function public\.handle_new_user\(\) from public, anon, authenticated;/,
    );
  });

  it("never grants broad public read access", () => {
    assert.doesNotMatch(flat, /to anon/i);
    assert.doesNotMatch(flat, /using \(true\)/);
  });
});
