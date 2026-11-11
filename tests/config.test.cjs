const { test } = require("node:test");
const assert = require("node:assert/strict");
const { publicConfig } = require("../scripts/config.cjs");
const env = {
  PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test",
};
test("accepts browser-safe config", () =>
  assert.equal(publicConfig(env).supabaseUrl, env.PUBLIC_SUPABASE_URL));
test("rejects missing configuration", () =>
  assert.throws(() => publicConfig({}), /required/));
for (const url of [
  "http://example.supabase.co",
  "https://evil.example",
  "https://example.supabase.co@evil.example",
  "https://example.supabase.co/path",
]) {
  test(`rejects invalid origin ${url}`, () =>
    assert.throws(() => publicConfig({ ...env, PUBLIC_SUPABASE_URL: url })));
}
test("rejects service-role and secret keys", () => {
  for (const key of [
    "sb_secret_test",
    "x." +
      Buffer.from(JSON.stringify({ role: "service_role" })).toString(
        "base64url",
      ) +
      ".x",
  ])
    assert.throws(
      () => publicConfig({ ...env, PUBLIC_SUPABASE_ANON_KEY: key }),
      /public/,
    );
});
test("accepts legacy anon keys", () =>
  assert.ok(
    publicConfig({
      ...env,
      PUBLIC_SUPABASE_ANON_KEY:
        "x." +
        Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url") +
        ".x",
    }),
  ));
