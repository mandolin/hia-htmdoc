const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const requiredPaths = [
  "README.md",
  "CHANGELOG.md",
  "RELEASE_CHECKLIST.md",
  "THIRD_PARTY_NOTICES.md",
  "LICENSE",
  "package.json",
  "pnpm-workspace.yaml",
  "examples/basic/README.md",
  "fixtures/README.md",
  "test/README.md",
  "packages/htmdoc-spec/package.json",
  "packages/html-parser/package.json",
  "packages/html-doc-extractor/package.json",
  "packages/html-doc-adapter/package.json",
  "packages/cem-adapter/package.json",
  "packages/html-doc-source-map/package.json"
];

let failed = false;

for (const relativePath of requiredPaths) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required skeleton path: ${relativePath}`);
    failed = true;
  }
}

const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (rootPackage.private !== true) {
  console.error("Root package must stay private until HTMDoc package names are finalized.");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("HTMDoc skeleton check passed.");
