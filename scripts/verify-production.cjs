/* Read-only HTTP checks. Never creates accounts or submits payments. */
const assert = require("node:assert/strict");
async function main({
  fetchImpl = fetch,
  token = process.env.KP_SMOKE_ACCESS_TOKEN,
  log = console.log,
} = {}) {
  async function request(path, options = {}) {
    return fetchImpl("https://www.kryptopesa.app" + path, {
      ...options,
      signal: AbortSignal.timeout(20000),
      redirect: "error",
    });
  }
  for (const path of [
    "/",
    "/login.html",
    "/signup.html",
    "/admin.html",
    "/homepage.html",
    "/privacy.html",
    "/terms.html",
    "/cookies.html",
    "/verify-identity.html",
    "/next/",
  ]) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-frame-options"), "DENY", path);
    assert.equal(
      response.headers.get("x-content-type-options"),
      "nosniff",
      path,
    );
    assert.match(
      response.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
      path,
    );
    assert.doesNotMatch(
      response.headers.get("content-security-policy"),
      /unsafe-inline|unsafe-eval/,
      path,
    );
    assert.notEqual(
      response.headers.get("access-control-allow-origin"),
      "*",
      path,
    );
    if (
      [
        "/login.html",
        "/signup.html",
        "/admin.html",
        "/homepage.html",
        "/verify-identity.html",
        "/next/",
      ].includes(path)
    ) {
      assert.match(response.headers.get("cache-control"), /no-store/, path);
    }
    log(`PASS ${path}: response policy`);
  }
  for (const headers of [{}, { Authorization: "Bearer invalid" }]) {
    const response = await request("/api/account", { headers });
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal((await response.json()).error, "unauthorized");
  }
  log("PASS /api/account: missing and invalid tokens rejected");
  if (token) {
    const response = await request("/api/account", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    const account = await response.json();
    assert.equal(account.account_status, "active");
    assert.deepEqual(Object.keys(account).sort(), [
      "account_status",
      "kyc_status",
      "username",
    ]);
    log("PASS authenticated account response (personal data omitted)");
  } else {
    log("SKIP authenticated account: no authorized test token supplied");
  }
}
module.exports = { main };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
