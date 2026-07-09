const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const requiredPaths = [
  "README.md",
  "CHANGELOG.md",
  "RELEASE_CHECKLIST.md",
  "THIRD_PARTY_NOTICES.md",
  "LICENSE",
  ".npmignore",
  "package.json",
  "pnpm-workspace.yaml",
  "examples/basic/README.md",
  "fixtures/README.md",
  "test/README.md",
  "test/htmdoc.test.mjs",
  "fixtures/basic.html",
  "packages/htmdoc-spec/package.json",
  "packages/htmdoc-spec/src/index.mjs",
  "packages/html-parser/package.json",
  "packages/html-parser/src/index.mjs",
  "packages/html-doc-extractor/package.json",
  "packages/html-doc-extractor/src/index.mjs",
  "packages/html-doc-adapter/package.json",
  "packages/html-doc-adapter/src/index.mjs",
  "packages/cem-adapter/package.json",
  "packages/cem-adapter/src/index.mjs",
  "packages/html-doc-source-map/package.json",
  "packages/html-doc-source-map/src/index.mjs",
  "scripts/check-pack.cjs",
  "scripts/build-fixtures.cjs",
  "scripts/check-fixtures.cjs",
  "fixtures/web-components/custom-elements.json",
  "fixtures/web-components/template.html",
  "fixtures/web-components/src/hia-card.js",
  "fixtures/web-components/dist/custom-elements.htmdoc.json",
  "fixtures/web-components/dist/custom-elements.hia.json",
  "fixtures/web-components/dist/template.htmdoc.json",
  "fixtures/web-components/dist/template.hia.json"
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
