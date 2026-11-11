const { test } = require("node:test");
const assert = require("node:assert/strict");
const { coverage } = require("../scripts/check-go-coverage.cjs");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
test("coverage gate counts statements rather than averaging package percentages", () => {
  assert.equal(
    coverage("mode: atomic\na.go:1.1,2.1 7 1\nb.go:1.1,2.1 3 0\n"),
    70,
  );
  assert.throws(() => coverage("mode: atomic\n"), /Empty/);
  assert.throws(() => coverage("mode: atomic\ninvalid"), /Malformed/);
});
test("coverage gate exits nonzero below threshold", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kp-coverage-"));
  try {
    const file = path.join(dir, "coverage.out");
    for (const [count, expected] of [
      [6, 1],
      [7, 0],
    ]) {
      fs.writeFileSync(
        file,
        `mode: atomic\na.go:1.1,2.1 ${count} 1\nb.go:1.1,2.1 ${10 - count} 0\n`,
      );
      assert.equal(
        spawnSync(process.execPath, ["scripts/check-go-coverage.cjs", file])
          .status,
        expected,
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
