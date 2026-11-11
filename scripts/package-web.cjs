const fs = require("node:fs");
fs.cpSync("web/dist/kryptopesa-web/browser", "dist/next", { recursive: true });
console.log("Angular account page packaged at /next/");
