#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";

import {
  HTMDOC_RUNNER_VERSION,
  inferHtmDocInputKind,
  loadHtmDocConfig,
  runHtmDoc
} from "./index.mjs";

const { values, positionals } = parseArgs({
  options: {
    config: { type: "string", short: "c" },
    help: { type: "boolean", short: "h" },
    kind: { type: "string", short: "k" },
    "no-doc-source-map": { type: "boolean" },
    "out-dir": { type: "string", short: "o" },
    "sources-content-policy": { type: "string" },
    version: { type: "boolean", short: "v" },
    "workspace-root": { type: "string" }
  },
  allowPositionals: true,
  strict: true
});

if (values.help) {
  process.stdout.write(`HTMDoc ${HTMDOC_RUNNER_VERSION}\n\nUsage:\n  htmdoc --config htmdoc.config.json\n  htmdoc [options] <input...>\n\nOptions:\n  -c, --config <path>\n  -k, --kind <kind>\n  -o, --out-dir <path>\n      --workspace-root <path>\n      --sources-content-policy <none|reference|embed>\n      --no-doc-source-map\n  -v, --version\n`);
  process.exit(0);
}

if (values.version) {
  process.stdout.write(`${HTMDOC_RUNNER_VERSION}\n`);
  process.exit(0);
}

try {
  const request = values.config
    ? await loadHtmDocConfig(values.config)
    : createCliRequest(values, positionals);

  if (values["out-dir"]) {
    request.outputDirectory = path.resolve(request.workspaceRoot, values["out-dir"]);
  }
  if (values["sources-content-policy"]) {
    request.options.sourcesContentPolicy = values["sources-content-policy"];
  }
  if (values["no-doc-source-map"]) {
    request.options.emitDocSourceMap = false;
  }

  const result = await runHtmDoc(request);
  process.stdout.write(`HTMDoc ${result.status}: ${result.artifacts.length} artifact(s).\n`);
  process.exitCode = result.status === "success" ? 0 : 1;
} catch (error) {
  process.stderr.write(`HTMDoc failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

function createCliRequest(cliValues, inputs) {
  if (inputs.length === 0) {
    throw new TypeError("At least one input or --config is required.");
  }
  const workspaceRoot = path.resolve(process.cwd(), cliValues["workspace-root"] ?? ".");
  return {
    workspaceRoot,
    outputDirectory: path.resolve(workspaceRoot, cliValues["out-dir"] ?? "dist/htmdoc"),
    inputs: inputs.map((inputPath) => ({
      kind: cliValues.kind ?? inferHtmDocInputKind(inputPath),
      path: inputPath
    })),
    options: {
      emitDocSourceMap: !cliValues["no-doc-source-map"],
      sourcesContentPolicy: cliValues["sources-content-policy"] ?? "none",
      writeResultManifest: true
    }
  };
}
