import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { displayName, firstName, initials } from "../lib/identity.ts";

describe("displayName", () => {
  it("prefers the profile name and normalises whitespace", () => {
    assert.equal(displayName("  Sam   Rivera "), "Sam Rivera");
  });

  it("derives a readable name from the email local part", () => {
    assert.equal(displayName(null, "sam.rivera@studio.com"), "Sam Rivera");
    assert.equal(displayName("", "hello-world@example.com"), "Hello World");
  });

  it("falls back when nothing is available", () => {
    assert.equal(displayName(null, null), "there");
    assert.equal(displayName(undefined, undefined, "friend"), "friend");
  });
});

describe("firstName", () => {
  it("uses the first word for greetings", () => {
    assert.equal(firstName("Sam Rivera"), "Sam");
    assert.equal(firstName(null, "sam.rivera@studio.com"), "Sam");
    assert.equal(firstName(null, null), "there");
  });
});

describe("initials", () => {
  it("builds up to two initials", () => {
    assert.equal(initials("Sam Rivera"), "SR");
    assert.equal(initials("Sam"), "S");
    assert.equal(initials(null, "sam@studio.com"), "S");
  });
});
