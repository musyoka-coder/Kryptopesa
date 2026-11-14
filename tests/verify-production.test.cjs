const { test } = require("node:test");
const assert = require("node:assert/strict");
const { main } = require("../scripts/verify-production.cjs");
function fixture({ badHeader, invalidAccepted, extraField } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const headers = {
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
      "cache-control": "private, no-store",
    };
    if (badHeader) headers[badHeader] = "*";
    const api = url.endsWith("/api/account");
    const valid = options.headers?.Authorization === "Bearer fixture-token";
    const body = valid
      ? {
          account_status: "active",
          kyc_status: "pending",
          username: "fixture",
          ...(extraField ? { email: "private" } : {}),
        }
      : { error: "unauthorized" };
    return new Response(JSON.stringify(body), {
      status: api && !valid && !invalidAccepted ? 401 : 200,
      headers,
    });
  };
  return { fetchImpl, calls };
}
test("checks every page and rejects anonymous tokens without leaking the authorized token", async () => {
  const { fetchImpl, calls } = fixture();
  const messages = [];
  await main({
    fetchImpl,
    token: "fixture-token",
    log: (m) => messages.push(m),
  });
  assert.equal(calls.length, 13);
  assert.equal(
    calls.filter(
      (c) => c.options.headers?.Authorization === "Bearer fixture-token",
    ).length,
    1,
  );
  assert.ok(
    calls.every((c) => c.options.redirect === "error" && c.options.signal),
  );
  assert.doesNotMatch(messages.join("\n"), /fixture-token/);
});
test("missing optional token explicitly skips authenticated check", async () => {
  const f = fixture();
  const messages = [];
  await main({
    fetchImpl: f.fetchImpl,
    token: "",
    log: (m) => messages.push(m),
  });
  assert.equal(f.calls.length, 12);
  assert.match(messages.at(-1), /SKIP/);
});
for (const options of [
  { badHeader: "x-frame-options" },
  { badHeader: "content-security-policy" },
  { badHeader: "access-control-allow-origin" },
  { invalidAccepted: true },
  { extraField: true },
]) {
  test(`fails on policy or authorization regression ${JSON.stringify(options)}`, async () => {
    await assert.rejects(
      main({
        fetchImpl: fixture(options).fetchImpl,
        token: "fixture-token",
        log: () => {},
      }),
    );
  });
}
test("network failures fail verification", async () => {
  await assert.rejects(
    main({
      fetchImpl: async () => {
        throw Error("network unavailable");
      },
      token: "",
      log: () => {},
    }),
    /network unavailable/,
  );
});
