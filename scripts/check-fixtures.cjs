const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const webComponentsRoot = path.join(root, "fixtures", "web-components");
const dist = path.join(webComponentsRoot, "dist");

const cemArtifact = readJson(path.join(dist, "custom-elements.htmdoc.json"));
const cemDocument = readJson(path.join(dist, "custom-elements.hia.json"));
const htmlArtifact = readJson(path.join(dist, "template.htmdoc.json"));
const htmlDocument = readJson(path.join(dist, "template.hia.json"));

let failed = false;

expectEqual(cemArtifact.contract, "hia-htmdoc-extraction", "CEM artifact contract");
expectEqual(cemArtifact.source.schemaVersion, "2.1.0", "CEM schema version");
expectSymbol(cemArtifact, "html-component", "hia-card");
expectSymbol(cemArtifact, "html-attribute", "variant");
expectSymbol(cemArtifact, "html-attribute", "dismissible");
expectSymbol(cemArtifact, "html-slot", "default");
expectSymbol(cemArtifact, "html-slot", "actions");
expectSymbol(cemArtifact, "html-event", "hia-card-dismiss");
expectSymbol(cemArtifact, "html-style-hook", "::part(action)");
expectSymbol(cemArtifact, "html-style-hook", "--hia-card-accent");
expectSymbol(cemArtifact, "html-style-hook", ":state(selected)");
expectSymbol(cemArtifact, "html-example", "examples/basic/index.html");
expectNoSymbolKind(cemArtifact, "html-property");
expectNoSymbolKind(cemArtifact, "html-method");

const cemComponent = cemArtifact.symbols.find((symbol) => symbol.kind === "html-component" && symbol.name === "hia-card");
if (!Array.isArray(cemComponent?.metadata?.javascript?.members) || cemComponent.metadata.javascript.members.length < 2) {
  fail("CEM component metadata must preserve JavaScript members for later JS bridge consumption.");
}

expectEqual(htmlArtifact.contract, "hia-htmdoc-extraction", "HTML artifact contract");
expectSymbol(htmlArtifact, "html-component", "hia-card");
expectSymbol(htmlArtifact, "html-template", "hia-card-template");
expectSymbol(htmlArtifact, "html-event", "hia-card-dismiss");
expectSymbol(htmlArtifact, "html-style-hook", "--hia-card-accent");

expectEqual(cemDocument.schemaVersion, "0.2.0", "CEM HIA schema version");
expectEqual(htmlDocument.schemaVersion, "0.2.0", "HTML HIA schema version");
expectEqual(cemDocument.symbols.length, cemArtifact.symbols.length, "CEM HIA symbol count");
expectEqual(htmlDocument.symbols.length, htmlArtifact.symbols.length, "HTML HIA symbol count");

expectSourcePolicy(cemArtifact);
expectSourcePolicy(htmlArtifact);
expectNoLocalPathLeakage(webComponentsRoot);

if (failed) {
  process.exit(1);
}

console.log("HTMDoc Web Components fixture check passed.");

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing fixture artifact: ${path.relative(root, filePath).replaceAll("\\", "/")}`);
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function expectSymbol(artifact, kind, name) {
  if (!artifact.symbols?.some((symbol) => symbol.kind === kind && symbol.name === name)) {
    fail(`Expected ${kind} symbol named ${name}.`);
  }
}

function expectNoSymbolKind(artifact, kind) {
  if (artifact.symbols?.some((symbol) => symbol.kind === kind)) {
    fail(`Unexpected ${kind} symbol in CEM HTMDoc artifact.`);
  }
}

function expectSourcePolicy(artifact) {
  expectEqual(artifact.sourceMap?.sourcesContentPolicy, "none", `${artifact.source?.path} source content policy`);
  if (Object.hasOwn(artifact.source ?? {}, "sourcesContent")) {
    fail(`${artifact.source.path} must not embed sourcesContent by default.`);
  }
}

function expectNoLocalPathLeakage(directory) {
  const forbidden = [
    "K:\\Project",
    "Github_mandolin",
    "HIA-Documentation-Sys"
  ];
  for (const filePath of listFiles(directory)) {
    const content = fs.readFileSync(filePath, "utf8");
    for (const marker of forbidden) {
      if (content.includes(marker)) {
        fail(`Local path leakage in ${path.relative(root, filePath).replaceAll("\\", "/")}: ${marker}`);
      }
    }
  }
}

function listFiles(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(entryPath));
    } else {
      result.push(entryPath);
    }
  }
  return result;
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label}: expected ${expected}, got ${actual}`);
  }
}

function fail(message) {
  console.error(message);
  failed = true;
}
