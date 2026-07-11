import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import htmdocProducer, { htmdocProducerDescriptor } from "../packages/htmdoc-producer/src/index.mjs";
import {
  HTMDOC_CONFIG_JSON_SCHEMA,
  HTMDOC_CONFIG_SCHEMA_ID,
  loadHtmDocConfig,
  runHtmDoc
} from "../packages/htmdoc-runner/src/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("standalone runner handles HTML, fragment, template and CEM inputs", async () => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "htmdoc-runner-"));
  try {
    const request = await loadHtmDocConfig(path.join(root, "examples/standalone/htmdoc.config.json"));
    assert.equal(HTMDOC_CONFIG_JSON_SCHEMA.$id, HTMDOC_CONFIG_SCHEMA_ID);
    request.outputDirectory = outputDirectory;
    const result = await runHtmDoc(request);

    assert.equal(result.status, "success");
    assert.equal(result.artifacts.length, 12);
    assert.deepEqual(new Set(result.artifacts.map((artifact) => artifact.kind)), new Set([
      "htmdoc-extraction",
      "hia-document",
      "doc-source-map"
    ]));

    const manifest = JSON.parse(await readFile(path.join(outputDirectory, "htmdoc.producer-result.json"), "utf8"));
    const docMapPath = result.artifacts.find((artifact) => artifact.kind === "doc-source-map").path;
    const docMap = JSON.parse(await readFile(path.join(outputDirectory, docMapPath), "utf8"));
    assert.equal(manifest.contract, "documentation-producer-result");
    assert.equal(docMap.contract, "doc-source-map");
    assert.deepEqual(docMap.pathBases, { artifacts: "outputDirectory", sources: "workspaceRoot" });
    assert.equal(docMap.privacy.sourcesContentPolicy, "none");
    assert.equal(JSON.stringify(manifest).includes(outputDirectory), false);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("HTMDoc producer delegates to the standalone runner", async () => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "htmdoc-producer-"));
  try {
    const progress = [];
    const result = await htmdocProducer.produce({
      workspaceRoot: path.join(root, "examples/standalone"),
      outputDirectory,
      inputs: [{ kind: "html-fragment", path: "src/badge.fragment.html" }],
      options: { writeResultManifest: false }
    }, {
      reportProgress(value) {
        progress.push(value.phase);
      }
    });

    assert.equal(htmdocProducerDescriptor.contract, "documentation-producer");
    assert.equal(htmdocProducerDescriptor.capabilities.sourceLinkage, true);
    assert.equal(result.status, "success");
    assert.equal(result.artifacts.length, 3);
    assert.deepEqual(progress, ["extract", "complete"]);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("runner rejects unsafe workspace-relative inputs", async () => {
  await assert.rejects(() => runHtmDoc({
    workspaceRoot: root,
    outputDirectory: path.join(root, "dist/unsafe-test"),
    inputs: [{ kind: "html", path: "../private.html" }]
  }), /safe relative path/);
});
