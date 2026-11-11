const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("../web/node_modules/jsdom");
const factory = require("../assets/pages/admin-helpers.js");
const { document } = new JSDOM("").window;
const helpers = factory(document);
const hash = "a".repeat(64);
for (const [network, asset, value, expected] of [
  ["bitcoin", "BTC", hash, "https://mempool.space/tx/" + hash],
  ["", "ETH", "0x" + hash, "https://etherscan.io/tx/0x" + hash],
  ["", "USDT", hash, "https://tronscan.org/#/transaction/" + hash],
  ["unknown", "ETH", hash, null],
  ["constructor", "ETH", hash, null],
  ["__proto__", "ETH", hash, null],
  ["ethereum", "ETH", "<img src=x onerror=alert(1)>", null],
  ["bitcoin", "BTC", "a".repeat(129), null],
  ["bitcoin", "BTC", "../redirect?to=evil", null],
  ["bitcoin", "BTC", "", null],
])
  test(`explorer validates ${network}/${asset}/${value.slice(0, 12)}`, () => {
    assert.equal(helpers.explorerUrl(network, asset, value), expected);
    const cell = helpers.chainCell(network, asset, value);
    assert.equal(cell.querySelector("a")?.href || null, expected);
    assert.equal(cell.querySelector("img"), null);
    if (expected)
      assert.equal(cell.querySelector("a").rel, "noopener noreferrer");
  });
test("database values render as text, never executable HTML", () => {
  const input = "<script>alert(1)</script>";
  const badge = helpers.badge(input);
  assert.equal(badge.textContent, input);
  assert.equal(badge.querySelector("script"), null);
  assert.equal(helpers.fmtDate("bad date"), "—");
  assert.equal(helpers.money("not money"), "—");
  assert.equal(helpers.fmtDate(null), "—");
});
test("formatters handle valid values and unknown devices", () => {
  assert.match(helpers.fmtDate("2026-01-01T00:00:00Z"), /2026/);
  assert.match(helpers.money(250), /250/);
  assert.equal(helpers.cryptoAmt("1.25"), "1.25");
  assert.equal(helpers.num("bad"), "0");
  assert.equal(helpers.ago(null), "never");
  assert.equal(helpers.ago("bad"), "—");
  assert.equal(helpers.ago(new Date().toISOString()), "just now");
  assert.equal(helpers.device(""), "—");
  assert.equal(helpers.device("Chrome/ Windows"), "Chrome · Windows");
  assert.equal(helpers.device("unknown"), "Browser · Unknown");
});

test("admin module graph boots and rejects a non-admin before showing data", async () => {
  const fs = require("node:fs");
  const dom = new JSDOM(fs.readFileSync("admin.html", "utf8"), {
    url: "https://fixture.example/admin.html",
    runScripts: "outside-only",
  });
  const w = dom.window;
  const rpcCalls = [];
  w.KPSession = { expired: () => false, start() {} };
  w.supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "user" } } } }),
    },
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => ({
          data: { id: "user", is_admin: false, account_status: "active" },
        }),
      };
    },
    rpc(name) {
      rpcCalls.push(name);
    },
  };
  try {
    for (const name of ["helpers", "charts", "ui", "user", "1"])
      w.eval(fs.readFileSync(`assets/pages/admin-${name}.js`, "utf8"));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(w.document.querySelector("#app").hidden, true);
    assert.match(
      w.document.querySelector("#gate").textContent,
      /Access denied/,
    );
    assert.deepEqual(rpcCalls, []);
  } finally {
    w.close();
  }
});
