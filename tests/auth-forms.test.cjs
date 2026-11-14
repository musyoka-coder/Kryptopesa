const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("../web/node_modules/jsdom");
const config = require("../vercel.json");
const globalHeaders = Object.fromEntries(
  config.headers[0].headers.map((h) => [h.key, h.value]),
);
for (const page of ["login", "signup", "forgot_password", "reset_password"]) {
  test(`${page}: native fallback never uses GET and CSP blocks form navigation`, (t) => {
    const dom = new JSDOM(fs.readFileSync(`${page}.html`, "utf8"), {
      url: `https://www.kryptopesa.app/${page}.html`,
    });
    t.after(() => dom.window.close());
    const d = dom.window.document;
    const form = d.querySelector("form");
    assert.equal(form.method, "post");
    assert.equal(d.querySelector("[formmethod]"), null);
    assert.match(
      globalHeaders["Content-Security-Policy"],
      /form-action 'none'(?:;|$)/,
    );
    assert.match(
      d.querySelector('meta[http-equiv="Content-Security-Policy"]').content,
      /form-action 'none'(?:;|$)/,
    );
    assert.equal(
      d.querySelector('meta[name="referrer"]').content,
      "no-referrer",
    );
    assert.match(
      d.querySelector("noscript").textContent,
      /JavaScript is required/,
    );
    const auth = config.headers.find((h) =>
      h.source.includes("forgot_password"),
    );
    assert.match(`/${page}.html`, new RegExp(`^${auth.source}$`));
    const headers = Object.fromEntries(
      auth.headers.map((h) => [h.key, h.value]),
    );
    assert.equal(headers["Cache-Control"], "private, no-store");
    assert.equal(headers["Referrer-Policy"], "no-referrer");
  });
}
for (const page of ["login", "signup"]) {
  test(`${page}: JavaScript cancels navigation and sends credentials only to the auth client`, async (t) => {
    const dom = new JSDOM(fs.readFileSync(`${page}.html`, "utf8"), {
      url: `https://www.kryptopesa.app/${page}.html`,
      runScripts: "outside-only",
    });
    t.after(() => dom.window.close());
    const w = dom.window;
    const calls = [];
    w.supabaseClient = {
      auth: {
        signInWithPassword: async (p) => {
          calls.push(p);
          return { error: { message: "Invalid login" } };
        },
        signUp: async (p) => {
          calls.push(p);
          return { error: { message: "Fixture rejection" } };
        },
      },
    };
    w.eval(fs.readFileSync(`assets/pages/${page}-1.js`, "utf8"));
    const d = w.document;
    d.querySelector('input[type="email"]').value = "fixture@example.test";
    for (const input of d.querySelectorAll('input[type="password"]'))
      input.value = "Fixture-password-123";
    if (page === "signup") d.getElementById("signupUsername").value = "fixture";
    const event = new w.Event("submit", { bubbles: true, cancelable: true });
    assert.equal(d.querySelector("form").dispatchEvent(event), false);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].email, "fixture@example.test");
    assert.equal(calls[0].password, "Fixture-password-123");
    assert.equal(w.location.search, "");
  });
}
