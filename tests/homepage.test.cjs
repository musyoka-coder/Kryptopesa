const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("../web/node_modules/jsdom");
async function page(
  t,
  { status = "unverified", price = "100", rate = 130 } = {},
) {
  const dom = new JSDOM(fs.readFileSync("homepage.html", "utf8"), {
    url: "https://www.kryptopesa.app/homepage.html",
    runScripts: "outside-only",
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.KPSession = { expired: () => false, start: () => {}, clear: () => {} };
  w.KPAccountAccess = {
    loadActiveAccount: async () => ({
      allowed: true,
      user: { id: "fixture", email: "fixture@example.test" },
      profile: { username: "fixture", kyc_status: status },
    }),
  };
  w.supabaseClient = {};
  w.fetch = async (url) => ({
    ok: true,
    json: async () =>
      url.includes("binance")
        ? [{ symbol: "BTCUSDT", lastPrice: price, priceChangePercent: "0" }]
        : { rates: { KES: rate } },
  });
  w.WebSocket = class {
    static OPEN = 1;
    static CONNECTING = 0;
    readyState = 1;
    close() {}
  };
  w.setInterval = () => 0;
  w.eval(fs.readFileSync("assets/pages/homepage-1.js", "utf8"));
  await new Promise((resolve) =>
    w.addEventListener("load", resolve, { once: true }),
  );
  await new Promise((resolve) => setImmediate(resolve));
  return w;
}
for (const [status, label] of [
  ["verified", "verified"],
  ["pending", "pending"],
  ["rejected", "rejected"],
  ["unexpected", "unverified"],
]) {
  test(`KYC badge fails closed for ${status}`, async (t) => {
    const w = await page(t, { status });
    const badge = w.document.getElementById("kycBadge");
    assert.equal(badge.textContent, `KYC ${label}`);
    assert.match(badge.getAttribute("aria-label"), new RegExp(`KYC ${label}`));
  });
}
test("balances never invent funds or enable unprovisioned deposits", async (t) => {
  const w = await page(t, { status: "verified" });
  const cards = [...w.document.querySelectorAll("#balanceGrid li")];
  assert.equal(cards.length, 4);
  for (const card of cards) {
    assert.match(
      card.querySelector(".balance-card__amount").textContent,
      /^— /,
    );
    assert.equal(card.querySelector("button").disabled, true);
  }
});
for (const price of ["NaN", "Infinity", "-1", "0", "100junk"]) {
  test(`invalid price ${price} never becomes a quote`, async (t) => {
    const w = await page(t, { price });
    assert.doesNotMatch(
      w.document.getElementById("p_BTCUSDT").textContent,
      /\$|NaN|Infinity/,
    );
  });
}
for (const rate of [-1, 0, "130", Infinity]) {
  test(`invalid exchange rate ${rate} fails closed`, async (t) => {
    const w = await page(t, { rate });
    assert.equal(
      w.document.getElementById("kesDisplay").textContent,
      "unavailable",
    );
  });
}
test("valid market data produces an indicative quote and payout remains disabled", async (t) => {
  const w = await page(t);
  const d = w.document;
  d.getElementById("swapCrypto").value = "BTC";
  d.getElementById("swapAmt").value = "1";
  d.getElementById("swapAmt").dispatchEvent(new w.Event("input"));
  assert.equal(d.getElementById("kesAmt").textContent, "13,000.00");
  assert.equal(d.getElementById("swapBtn").disabled, true);
  d.getElementById("swapBtn").dispatchEvent(new w.Event("click"));
  assert.match(
    d.getElementById("swapResult").textContent,
    /Nothing has been sent/,
  );
});
