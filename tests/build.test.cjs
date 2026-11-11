const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
test("fresh fixture build excludes secrets and private source", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kp-build-"));
  try {
    for (const file of fs
      .readdirSync(".")
      .filter((f) => f.endsWith(".html"))
      .concat([
        "index.js",
        "supabase-client.js",
        "session-management.js",
        "account-access.js",
        "logo.jpg",
        "assets",
        "scripts",
      ]))
      fs.cpSync(file, path.join(temp, file), { recursive: true });
    fs.writeFileSync(
      path.join(temp, ".env.local"),
      "PRIVATE_SECRET=do-not-ship",
    );
    execFileSync(process.execPath, ["scripts/build.cjs"], {
      cwd: temp,
      env: {
        ...process.env,
        PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
        PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_fixture",
      },
    });
    assert.ok(fs.existsSync(path.join(temp, "dist/index.html")));
    assert.match(
      fs.readFileSync(path.join(temp, "dist/config.js"), "utf8"),
      /fixture.supabase.co/,
    );
    for (const forbidden of [
      ".env.local",
      "scripts",
      "package.json",
      "supabase",
      "docs",
      "internal",
    ])
      assert.equal(fs.existsSync(path.join(temp, "dist", forbidden)), false);
    const failed = spawnSync(process.execPath, ["scripts/build.cjs"], {
      cwd: temp,
      env: {
        ...process.env,
        PUBLIC_SUPABASE_URL: "",
        PUBLIC_SUPABASE_ANON_KEY: "",
      },
    });
    assert.notEqual(failed.status, 0);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
