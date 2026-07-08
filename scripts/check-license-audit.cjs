const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const lockPath = path.join(root, "package-lock.json");
const allowedExternalPackages = new Map([
  ["parse5", "MIT"],
  ["entities", "BSD-2-Clause"]
]);

if (!fs.existsSync(lockPath)) {
  console.error("package-lock.json is required after adding reviewed parser dependencies.");
  process.exit(1);
}

const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
let failed = false;

for (const packagePath of Object.keys(lock.packages || {})) {
  const packageName = getExternalPackageName(packagePath);
  if (!packageName) {
    continue;
  }
  if (!allowedExternalPackages.has(packageName)) {
    console.error(`Unreviewed external dependency in lockfile: ${packageName}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("HTMDoc license audit passed: parse5 MIT and entities BSD-2-Clause are reviewed.");

function getExternalPackageName(packagePath) {
  if (!packagePath.includes("node_modules/")) {
    return null;
  }
  if (packagePath.startsWith("node_modules/@hia-doc/")) {
    return null;
  }
  const parts = packagePath.split("node_modules/").at(-1).split("/");
  if (parts[0].startsWith("@")) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}
