const { test } = require("node:test");
const assert = require("node:assert/strict");
const { coverage } = require("../scripts/check-go-coverage.cjs");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
test("coverage weights statements rather than blocks or execution counts", () => {
  assert.equal(
    coverage("mode: atomic\na.go:1.1,2.1 7 10\na.go:3.1,4.1 3 0\n"),
    70,
  );
});
for (const profile of [
  "",
  "mode: atomic\n",
  "mode: set\nbad",
  "mode: count\na:1.1,2.1 1 1\na:1.1,2.1 1 1",
]) {
  test(
    "rejects malformed, empty or duplicate profile " + JSON.stringify(profile),
    () => assert.throws(() => coverage(profile)),
  );
}
test("CLI fails below threshold and passes at threshold", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kp-coverage-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "coverage.out");
  for (const [covered, uncovered, status] of [
    [69, 31, 1],
    [70, 30, 0],
  ]) {
    fs.writeFileSync(
      file,
      `mode: atomic\na:1.1,2.1 ${covered} 1\na:3.1,4.1 ${uncovered} 0\n`,
    );
    assert.equal(
      spawnSync(process.execPath, ["scripts/check-go-coverage.cjs", file])
        .status,
      status,
    );
  }
});
