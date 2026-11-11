const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadActiveAccount } = require("../account-access.js");
function client({
  user = { id: "owner", email_confirmed_at: "2026-01-01" },
  error = null,
  profile = { account_status: "active" },
  profileError = null,
} = {}) {
  return {
    auth: { getUser: async () => ({ data: { user }, error }) },
    from(table) {
      assert.equal(table, "profiles");
      return {
        select() {
          return this;
        },
        eq(key, id) {
          assert.equal(key, "id");
          assert.equal(id, "owner");
          return this;
        },
        single: async () => ({ data: profile, error: profileError }),
      };
    },
  };
}
test("confirmed active owner is admitted", async () =>
  assert.equal((await loadActiveAccount(client())).allowed, true));
for (const [label, options] of Object.entries({
  missingUser: { user: null },
  unconfirmed: { user: { id: "owner" } },
  authError: { error: new Error("bad token") },
  missingProfile: { profile: null },
  profileError: { profileError: new Error("RLS") },
  suspended: { profile: { account_status: "suspended" } },
  unknown: { profile: { account_status: "new-status" } },
})) {
  test(`denies ${label}`, async () =>
    assert.equal((await loadActiveAccount(client(options))).allowed, false));
}
test("network failures deny access", async () =>
  assert.equal(
    (
      await loadActiveAccount({
        auth: {
          getUser: async () => {
            throw Error("offline");
          },
        },
      })
    ).allowed,
    false,
  ));
test("hung requests deny access within a bounded interval", async () =>
  assert.equal(
    (
      await loadActiveAccount(
        { auth: { getUser: () => new Promise(() => {}) } },
        5,
      )
    ).allowed,
    false,
  ));
