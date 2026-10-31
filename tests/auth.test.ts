/**
 * Auth copy + redirect-target guards. Pure, no credentials required.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  friendlyAuthError,
  needsEmailConfirmation,
  safeNextPath,
} from "../lib/auth-errors.ts";

describe("friendlyAuthError", () => {
  it("explains bad credentials without leaking provider wording", () => {
    const message = friendlyAuthError("Invalid login credentials", "login");
    assert.match(message, /Incorrect email or password/);
    assert.doesNotMatch(message, /Invalid login credentials/);
  });

  it("tells the user to confirm their email", () => {
    assert.match(
      friendlyAuthError("Email not confirmed", "login"),
      /Confirm your email/,
    );
  });

  it("points existing users to sign in", () => {
    assert.match(
      friendlyAuthError("User already registered", "signup"),
      /already exists/,
    );
  });

  it("normalises password policy and rate-limit errors", () => {
    assert.match(
      friendlyAuthError("Password should be at least 6 characters", "signup"),
      /8 characters/,
    );
    assert.match(
      friendlyAuthError("Email rate limit exceeded", "signup"),
      /Too many attempts/,
    );
  });

  it("falls back to a mode-specific message", () => {
    assert.equal(
      friendlyAuthError("boom", "signup"),
      "We could not create your account. Please try again.",
    );
    assert.equal(
      friendlyAuthError("boom", "login"),
      "We could not sign you in. Please try again.",
    );
  });
});

describe("needsEmailConfirmation", () => {
  it("detects the confirmation error only", () => {
    assert.equal(needsEmailConfirmation("Email not confirmed"), true);
    assert.equal(needsEmailConfirmation("Invalid login credentials"), false);
  });
});

describe("safeNextPath", () => {
  it("keeps internal dashboard paths", () => {
    assert.equal(safeNextPath("/dashboard/proposals/abc"), "/dashboard/proposals/abc");
    assert.equal(safeNextPath("/dashboard/new"), "/dashboard/new");
  });

  it("blocks open redirects", () => {
    for (const value of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "javascript:alert(1)",
      "http://localhost:3000/dashboard",
    ]) {
      assert.equal(safeNextPath(value), "/dashboard", `expected fallback for ${value}`);
    }
  });

  it("never loops back to auth pages", () => {
    assert.equal(safeNextPath("/login"), "/dashboard");
    assert.equal(safeNextPath("/signup?next=/dashboard"), "/dashboard");
    assert.equal(safeNextPath("/auth/signout"), "/dashboard");
  });

  it("uses the fallback for empty input and supports a custom fallback", () => {
    assert.equal(safeNextPath(undefined), "/dashboard");
    assert.equal(safeNextPath(null, "/"), "/");
  });
});
