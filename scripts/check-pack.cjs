const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32"
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

const packs = JSON.parse(result.stdout);
let failed = false;

for (const pack of packs) {
  for (const file of pack.files || []) {
    const filePath = file.path.replaceAll("\\", "/");
    if (filePath.includes("/node_modules/") || filePath.startsWith("node_modules/") || filePath.endsWith(".tgz")) {
      console.error(`Unsafe file in HTMDoc pack dry-run: ${file.path}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("HTMDoc pack check passed.");
