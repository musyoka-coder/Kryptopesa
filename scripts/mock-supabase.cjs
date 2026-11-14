// Local fixtures only. This is not a database or a model of Supabase RLS.
const http = require("node:http");
function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  const respond = (status, value) => {
    res.writeHead(status);
    res.end(JSON.stringify(value));
  };
  if (req.method !== "GET")
    return respond(405, { error: "method_not_allowed" });
  if (
    req.headers.authorization !== "Bearer local-test-token" ||
    req.headers.apikey !== "local-fixture-key"
  )
    return respond(401, { error: "unauthorized" });
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/auth/v1/user")
    return respond(200, {
      id: "local-owner",
      email_confirmed_at: "2026-01-01T00:00:00Z",
    });
  if (
    url.pathname === "/rest/v1/profiles" &&
    url.searchParams.get("id") === "eq.local-owner"
  )
    return respond(200, [
      {
        username: "Local fixture",
        account_status: "active",
        kyc_status: "pending",
      },
    ]);
  return respond(404, { error: "not_found" });
}
module.exports = { handler };
if (require.main === module)
  http
    .createServer(handler)
    .listen(8081, "127.0.0.1", () =>
      console.log("Fixture upstream listening on loopback port 8081"),
    );
