const fs = require("node:fs");
function coverage(profile) {
  let total = 0,
    covered = 0;
  for (const line of profile.trim().split("\n").slice(1)) {
    const fields = line.trim().split(/\s+/);
    if (
      fields.length !== 3 ||
      !/^\d+$/.test(fields[1]) ||
      !/^\d+$/.test(fields[2])
    )
      throw Error("Malformed coverage profile");
    const statements = Number(fields[1]);
    total += statements;
    if (Number(fields[2]) > 0) covered += statements;
  }
  if (!total) throw Error("Empty coverage profile");
  return (covered / total) * 100;
}
if (require.main === module) {
  const percent = coverage(fs.readFileSync(process.argv[2], "utf8"));
  console.log(`Go statement coverage: ${percent.toFixed(2)}% (minimum 70%)`);
  if (percent < 70) process.exitCode = 1;
}
module.exports = { coverage };
