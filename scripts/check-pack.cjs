const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const npmCli = process.env.npm_execpath;
const npmArgs = ["pack", "--dry-run", "--json"];
const command = npmCli
  ? process.execPath
  : process.platform === "win32"
    ? process.env.ComSpec || "cmd.exe"
    : "npm";
const args = npmCli
  ? [npmCli, ...npmArgs]
  : process.platform === "win32"
    ? ["/d", "/s", "/c", `npm ${npmArgs.join(" ")}`]
    : npmArgs;
const result = spawnSync(command, args, {
  cwd: root,
  encoding: "utf8"
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "npm pack failed.\n");
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
