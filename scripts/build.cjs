const fs = require("node:fs");
const path = require("node:path");
const { publicConfig } = require("./config.cjs");
const config = publicConfig(process.env);
const out = path.resolve("dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
// Explicit allowlist: no source reports, SQL, environment files or tests are served.
for (const file of fs
  .readdirSync(".")
  .filter((f) => /\.html$/.test(f))
  .concat([
    "index.js",
    "supabase-client.js",
    "session-management.js",
    "account-access.js",
    "logo.jpg",
    "assets",
  ])) {
  fs.cpSync(file, path.join(out, file), { recursive: true });
}
fs.writeFileSync(
  path.join(out, "config.js"),
  "window.KP_CONFIG = Object.freeze(" + JSON.stringify(config) + ");\n",
);
console.log("Static site built in dist/");
