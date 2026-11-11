const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("../web/node_modules/jsdom");
function setup(page, options = {}) {
  const dom = new JSDOM(fs.readFileSync(`${page}.html`, "utf8"), {
    url: "https://fixture.example/" + page + ".html",
    runScripts: "outside-only",
  });
  const w = dom.window;
  const calls = [];
  w.KPSession = {
    signedIn() {
      calls.push("signedIn");
    },
    savePreference() {},
  };
  w.supabaseClient = {
    auth: {
      async signInWithPassword() {
        calls.push("login");
        if (options.offline) throw Error("offline");
        return {
          data: {
            user: options.unconfirmed
              ? { id: "owner" }
              : { id: "owner", email_confirmed_at: "yes" },
          },
          error: options.authError || null,
        };
      },
      async signUp() {
        calls.push("signup");
        return {
          data: { session: options.autoConfirm ? {} : null },
          error: null,
        };
      },
      async signOut() {
        calls.push("signOut");
      },
    },
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async single() {
          return {
            data: options.profile || { account_status: "suspended" },
            error: options.profileError || null,
          };
        },
        async insert() {
          calls.push("audit");
        },
      };
    },
  };
  w.eval(fs.readFileSync(`assets/pages/${page}-1.js`, "utf8"));
  const set = (id, value) => {
    w.document.getElementById(id).value = value;
  };
  if (page === "login") {
    set("loginEmail", "user@example.com");
    set("loginPassword", "password");
  } else {
    set("signupUsername", "valid_user");
    set("signupEmail", "user@example.com");
    set("signupPassword", "secret1");
    set("confirmPassword", "secret1");
  }
  return {
    w,
    calls,
    set,
    async submit() {
      w.document
        .querySelector("form")
        .dispatchEvent(new w.Event("submit", { cancelable: true }));
      await new Promise((resolve) => setImmediate(resolve));
      return w.document.getElementById("errorMsg").textContent;
    },
    close: () => w.close(),
  };
}
for (const [name, options, expected] of [
  ["unconfirmed", { unconfirmed: true }, /Confirm your email/],
  ["suspended", {}, /unavailable or inactive/],
  [
    "profile failure",
    { profileError: { message: "private db details" } },
    /could not load your account/,
  ],
  ["network failure", { offline: true }, /could not reach/],
  [
    "invalid credentials",
    { authError: { message: "Invalid login credentials" } },
    /Invalid email or password/,
  ],
])
  test(`login denies ${name}`, async () => {
    const p = setup("login", options);
    try {
      assert.match(await p.submit(), expected);
      assert.ok(!p.calls.includes("signedIn"));
      if (!options.offline && !options.authError)
        assert.ok(p.calls.includes("signOut"));
    } finally {
      p.close();
    }
  });
for (const [field, value, expected] of [
  ["signupUsername", "ab", /at least 3/],
  ["signupUsername", "<script>", /only contain/],
  ["signupEmail", "invalid", /valid email/],
  ["signupPassword", "12345", /at least 6/],
  ["confirmPassword", "mismatch", /do not match/],
])
  test(`signup rejects invalid ${field}`, async () => {
    const p = setup("signup");
    try {
      p.set(field, value);
      assert.match(await p.submit(), expected);
      assert.deepEqual(p.calls, []);
    } finally {
      p.close();
    }
  });
test("signup requires email confirmation and never accepts an automatic session", async () => {
  const p = setup("signup", { autoConfirm: true });
  try {
    assert.match(await p.submit(), /confirmation is not enforced/);
    assert.deepEqual(p.calls, ["signup", "signOut"]);
  } finally {
    p.close();
  }
});
test("signup shows neutral confirmation notice without claiming an account exists", async () => {
  const p = setup("signup");
  try {
    assert.match(await p.submit(), /If your address is eligible/);
    assert.equal(p.w.document.querySelector("form").hidden, true);
  } finally {
    p.close();
  }
});
