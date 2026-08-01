import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateHtmDocOutputConformance,
  HTMDOC_OUTPUT_CONFORMANCE_CONTRACT,
  HTMDOC_OUTPUT_CONFORMANCE_VERSION
} from "../packages/htmdoc-spec/src/index.mjs";
import { runHtmDoc } from "../packages/htmdoc-runner/src/index.mjs";

// <lang><zh-CN>test root 固定为 HTMDoc owner workspace；它不引用九项目 target 的任何 path。</zh-CN><en>The test root is fixed to the HTMDoc owner workspace; it references no path from the nine target projects.</en></lang>
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Materialize a single synthetic HTMDoc output triplet for pure conformance evaluation.
 *
 * 中文：materialize 一组 synthetic HTMDoc output triplet 供 pure conformance evaluation。
 * English: Materialize one synthetic HTMDoc output triplet for pure conformance evaluation.
 *
 * @param {"none"|"embed"} sourcesContentPolicy <lang><zh-CN>fixture 明确请求的 source-content policy。</zh-CN><en>Source-content policy explicitly requested by the fixture.</en></lang>
 * @returns {Promise<{outputDirectory:string,bundle:Record<string,unknown>}>} <lang><zh-CN>临时输出目录和仅含 JSON artifact 的 bundle。</zh-CN><en>Temporary output directory and a bundle containing only JSON artifacts.</en></lang>
 * @lang zh-CN helper 运行 owner fixture，不读取 target source；caller 必须在 finally 中精确删除 outputDirectory。
 */
async function createConformanceBundle(sourcesContentPolicy) {
  // <lang><zh-CN>临时目录由 mkdtemp 提供唯一性，避免 test 与 repository fixture output 互相覆盖。</zh-CN><en>The temporary directory gains uniqueness from mkdtemp, avoiding overlap between tests and repository fixture output.</en></lang>
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "htmdoc-conformance-test-"));
  // <lang><zh-CN>runner request 固定为一个 HTML fixture 和 explicit ordinary map；没有 target command、network 或 publish side effect。</zh-CN><en>The runner request is fixed to one HTML fixture and an explicit ordinary map; it has no target command, network, or publish side effect.</en></lang>
  const producerResult = await runHtmDoc({
    workspaceRoot,
    outputDirectory,
    inputs: [{ kind: "html-fragment", path: "fixtures/basic.html" }],
    options: { emitDocSourceMap: true, sourcesContentPolicy, writeResultManifest: false }
  });
  // <lang><zh-CN>每个 find 只选择已声明 kind；缺失会在 assertion 中显式失败，避免 fallback 到未批准 file。</zh-CN><en>Each find selects only a declared kind; absence fails explicitly in assertions rather than falling back to an unapproved file.</en></lang>
  const extractionArtifact = producerResult.artifacts.find((artifact) => artifact.kind === "htmdoc-extraction");
  const documentArtifact = producerResult.artifacts.find((artifact) => artifact.kind === "hia-document");
  const mapArtifact = producerResult.artifacts.find((artifact) => artifact.kind === "doc-source-map");
  assert.ok(extractionArtifact);
  assert.ok(documentArtifact);
  assert.ok(mapArtifact);
  // <lang><zh-CN>读取范围严格为刚生成的三份 JSON artifact；HTML fixture text 不进入 evaluator bundle。</zh-CN><en>Read scope is limited to the three just-generated JSON artifacts; HTML fixture text never enters the evaluator bundle.</en></lang>
  const extraction = JSON.parse(await readFile(path.join(outputDirectory, extractionArtifact.path), "utf8"));
  const document = JSON.parse(await readFile(path.join(outputDirectory, documentArtifact.path), "utf8"));
  const docSourceMap = JSON.parse(await readFile(path.join(outputDirectory, mapArtifact.path), "utf8"));
  return { outputDirectory, bundle: { extraction, document, docSourceMap, producerResult } };
}

test("HTMDoc output conformance accepts default none policy and stable artifact continuity", async () => {
  // <lang><zh-CN>default fixture 对应生产默认 policy；在 finally 前不让 temporary output 泄漏到后续 test。</zh-CN><en>The default fixture matches the production default policy; do not let temporary output leak into later tests before finally.</en></lang>
  const fixture = await createConformanceBundle("none");
  try {
    const conformance = evaluateHtmDocOutputConformance(fixture.bundle);
    assert.deepEqual(conformance, {
      contract: HTMDOC_OUTPUT_CONFORMANCE_CONTRACT,
      contractVersion: HTMDOC_OUTPUT_CONFORMANCE_VERSION,
      conformant: true,
      violations: []
    });
  } finally {
    // <lang><zh-CN>删除 exact temporary directory，确保测试没有留下 artifact 或修改 workspace fixture。</zh-CN><en>Delete the exact temporary directory so the test leaves no artifact and never modifies a workspace fixture.</en></lang>
    await rm(fixture.outputDirectory, { recursive: true, force: true });
  }
});

test("HTMDoc output conformance requires explicit confirmation for embedded source", async () => {
  // <lang><zh-CN>embed fixture 只验证授权语义；source content 不写入 assertion message、test output 或 repository artifact。</zh-CN><en>The embed fixture validates authorization semantics only; source content is not written into assertion messages, test output, or repository artifacts.</en></lang>
  const fixture = await createConformanceBundle("embed");
  try {
    const refused = evaluateHtmDocOutputConformance(fixture.bundle);
    const accepted = evaluateHtmDocOutputConformance(fixture.bundle, { allowEmbeddedSource: true });
    assert.equal(refused.conformant, false);
    assert.ok(refused.violations.some((violation) => violation.code === "HTMDOC_OUTPUT_CONFORMANCE_EMBED_UNAUTHORIZED"));
    assert.equal(accepted.conformant, true);
  } finally {
    // <lang><zh-CN>清理仅限 helper 创建的 temporary directory；embed fixture 不会持久化 source body。</zh-CN><en>Cleanup is limited to the temporary directory created by the helper; the embed fixture does not persist a source body.</en></lang>
    await rm(fixture.outputDirectory, { recursive: true, force: true });
  }
});

test("HTMDoc output conformance refuses an unreviewed sidecar field without echoing it", async () => {
  // <lang><zh-CN>负向样本只修改 in-memory clone；它模拟 future sidecar drift，不写回 doc-source-map 或 fixture output。</zh-CN><en>The negative sample modifies only an in-memory clone; it simulates future sidecar drift without writing back a doc-source-map or fixture output.</en></lang>
  const fixture = await createConformanceBundle("none");
  try {
    const invalidBundle = structuredClone(fixture.bundle);
    invalidBundle.docSourceMap.localeResolutionSidecars = [{ id: "unreviewed" }];
    const conformance = evaluateHtmDocOutputConformance(invalidBundle);
    assert.equal(conformance.conformant, false);
    assert.ok(conformance.violations.some((violation) => violation.code === "HTMDOC_OUTPUT_CONFORMANCE_SIDECAR_BOUNDARY_INVALID"));
    assert.equal(JSON.stringify(conformance).includes("unreviewed"), false);
  } finally {
    // <lang><zh-CN>所有 negative mutation 都驻留在 memory；cleanup 仍只删除 temporary output。</zh-CN><en>All negative mutations remain in memory; cleanup still deletes only temporary output.</en></lang>
    await rm(fixture.outputDirectory, { recursive: true, force: true });
  }
});
