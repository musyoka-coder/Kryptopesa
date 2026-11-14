const fs = require("node:fs");
function coverage(profile) {
  const lines = profile.trim().split(/\r?\n/);
  if (!/^mode: (set|count|atomic)$/.test(lines.shift()))
    throw Error("Invalid coverage header");
  let total = 0,
    covered = 0;
  const seen = new Set();
  for (const line of lines) {
    const match = line.match(/^(\S+:\d+\.\d+,\d+\.\d+) (\d+) (\d+)$/);
    if (!match || seen.has(match[1]))
      throw Error("Invalid or duplicate coverage block");
    seen.add(match[1]);
    const statements = Number(match[2]);
    total += statements;
    if (Number(match[3]) > 0) covered += statements;
  }
  if (!total) throw Error("No statements measured");
  return (100 * covered) / total;
}
module.exports = { coverage };
if (require.main === module) {
  try {
    const percent = coverage(
      fs.readFileSync(process.argv[2] || "coverage.out", "utf8"),
    );
    console.log(`Go statement coverage: ${percent.toFixed(2)}% (minimum 70%)`);
    if (percent < 70) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
