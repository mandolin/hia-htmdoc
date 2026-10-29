const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const lockPath = path.join(root, "package-lock.json");
const allowedExternalPackages = new Map([
  ["parse5", "MIT"],
  ["entities", "BSD-2-Clause"],
  ["ajv", "MIT"],
  ["fast-deep-equal", "MIT"],
  ["fast-uri", "BSD-3-Clause"],
  ["json-schema-traverse", "MIT"],
  ["require-from-string", "MIT"]
]);
/** @lang zh-CN 限定此次已审计的精确实现，不让许可白名单掩盖未审版本升级。 @lang en Pins the reviewed implementations so a license allowlist cannot hide unreviewed upgrades. */
const reviewedVersions = new Map([["parse5", "7.3.0"], ["entities", "6.0.1"], ["ajv", "8.17.1"], ["fast-deep-equal", "3.1.3"], ["fast-uri", "3.1.9"], ["json-schema-traverse", "1.0.0"], ["require-from-string", "2.0.2"]]);

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
    continue;
  }
  // <lang><zh-CN>同时核锁来源/版本及实际安装许可证；不只按包名放行。</zh-CN><en>Check locked origin/version and the installed license rather than allowing by name alone.</en></lang>
  const entry = lock.packages[packagePath];
  const manifest = JSON.parse(fs.readFileSync(path.join(root, packagePath, "package.json"), "utf8"));
  if (entry.version !== reviewedVersions.get(packageName) || !entry.resolved?.startsWith("https://registry.npmjs.org/") || !entry.integrity || manifest.license !== allowedExternalPackages.get(packageName)) {
    console.error(`Reviewed dependency identity/license drift: ${packageName}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("HTMDoc license audit passed: seven pinned MIT/BSD parser/schema dependencies are reviewed.");

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
