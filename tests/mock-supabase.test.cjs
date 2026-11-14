const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { handler } = require("../scripts/mock-supabase.cjs");
test("local upstream checks fixture credentials and owner scope", async (t) => {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = {
    Authorization: "Bearer local-test-token",
    apikey: "local-fixture-key",
  };
  assert.equal((await fetch(base + "/auth/v1/user")).status, 401);
  assert.equal(
    (await fetch(base + "/auth/v1/user", { headers, method: "POST" })).status,
    405,
  );
  assert.equal(
    (await (await fetch(base + "/auth/v1/user", { headers })).json()).id,
    "local-owner",
  );
  assert.equal(
    (await fetch(base + "/rest/v1/profiles?id=eq.other", { headers })).status,
    404,
  );
  assert.equal(
    (
      await (
        await fetch(base + "/rest/v1/profiles?id=eq.local-owner", { headers })
      ).json()
    )[0].account_status,
    "active",
  );
});
