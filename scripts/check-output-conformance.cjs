/**
 * Verify HTMDoc owner-local output conformance from a temporary synthetic runner result.
 *
 * 中文：从临时 synthetic runner result 验证 HTMDoc owner-local output conformance。
 * English: Verify HTMDoc owner-local output conformance from a temporary synthetic runner result.
 *
 * @returns {Promise<void>} <lang><zh-CN>门禁完成 promise。</zh-CN><en>Gate-completion promise.</en></lang>
 * @lang zh-CN 本检查只运行 HIA owner fixture，并只比较已生成 JSON；不会访问 target repository、network 或 source body output。
 */
async function checkOutputConformance() {
  // <lang><zh-CN>依赖从 workspace package source 加载，使 gate 验证将被 publish 的实际 ESM entry。</zh-CN><en>Load dependencies from workspace package sources so the gate validates the actual ESM entries that will be published.</en></lang>
  const { mkdtemp, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { runHtmDoc } = await import("../packages/htmdoc-runner/src/index.mjs");
  const { evaluateHtmDocOutputConformance } = await import("../packages/htmdoc-spec/src/index.mjs");
  // <lang><zh-CN>CommonJS `__dirname` 固定当前 script location；temporary output 仅存在于 OS temp 并在 finally 精确移除。</zh-CN><en>CommonJS `__dirname` fixes the current script location; the temporary output exists only in OS temp and is removed precisely in finally.</en></lang>
  const workspaceRoot = path.resolve(__dirname, "..");
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "htmdoc-output-conformance-"));

  try {
    // <lang><zh-CN>输入是仓库内固定 HTML fixture，默认 none policy；该 invocation 不使用任何 target path 或 remote input。</zh-CN><en>The input is a fixed repository HTML fixture under the default none policy; this invocation uses neither target paths nor remote input.</en></lang>
    const producerResult = await runHtmDoc({
      workspaceRoot,
      outputDirectory,
      inputs: [{ kind: "html-fragment", path: "fixtures/basic.html" }],
      options: { emitDocSourceMap: true, sourcesContentPolicy: "none", writeResultManifest: false }
    });
    // <lang><zh-CN>artifact records 只提供 output-relative path；读取三个刚生成 JSON 是 conformance 的唯一 I/O。</zh-CN><en>Artifact records provide only output-relative paths; reading the three just-generated JSON files is the sole conformance I/O.</en></lang>
    const extractionArtifact = producerResult.artifacts.find((artifact) => artifact.kind === "htmdoc-extraction");
    const documentArtifact = producerResult.artifacts.find((artifact) => artifact.kind === "hia-document");
    const mapArtifact = producerResult.artifacts.find((artifact) => artifact.kind === "doc-source-map");
    // <lang><zh-CN>三类 artifact 是 P1 output boundary 的固定集合；任一缺失都作为 gate failure，而不是读取其他文件猜测。</zh-CN><en>The three artifact classes are the fixed P1 output boundary; any missing class is a gate failure rather than a reason to inspect other files.</en></lang>
    if (!extractionArtifact || !documentArtifact || !mapArtifact) {
      throw new Error("HTMDoc output conformance fixture did not produce the required artifact triplet.");
    }
    // <lang><zh-CN>JSON parser 只消费 runner 当前写出的 artifact；不读取 HTML fixture content 作为 evaluator input。</zh-CN><en>The JSON parser consumes only artifacts written by this runner invocation; it does not read HTML fixture content as evaluator input.</en></lang>
    const extraction = JSON.parse(await readFile(path.join(outputDirectory, extractionArtifact.path), "utf8"));
    const document = JSON.parse(await readFile(path.join(outputDirectory, documentArtifact.path), "utf8"));
    const docSourceMap = JSON.parse(await readFile(path.join(outputDirectory, mapArtifact.path), "utf8"));
    const conformance = evaluateHtmDocOutputConformance({ extraction, document, docSourceMap, producerResult });
    if (!conformance.conformant) {
      throw new Error(`HTMDoc output conformance failed: ${conformance.violations.map((violation) => violation.code).join(", ")}`);
    }
  } finally {
    // <lang><zh-CN>仅删除本函数创建且由 mkdtemp 返回的 exact temporary directory；不触及 workspace 或 target tree。</zh-CN><en>Delete only the exact temporary directory created and returned by mkdtemp; never touch the workspace or a target tree.</en></lang>
    await rm(outputDirectory, { recursive: true, force: true });
  }
}

// <lang><zh-CN>顶层只将固定 error message 写往 stderr；不序列化 artifact、path 或 source content。</zh-CN><en>The top level writes only the fixed error message to stderr; it never serializes artifacts, paths, or source content.</en></lang>
checkOutputConformance().then(() => {
  console.log("HTMDoc output conformance check passed.");
}).catch((error) => {
  console.error(error instanceof Error ? error.message : "HTMDoc output conformance check failed.");
  process.exitCode = 1;
});
