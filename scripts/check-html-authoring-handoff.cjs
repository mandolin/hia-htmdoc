/**
 * 验证 HTMDoc 的 metadata-only HTML-authoring handoff fixtures。
 *
 * 本 gate 只读取固定 HIA-owned JSON fixture file；绝不发现、读取、运行或写入 target repository、source body、
 * source map body、desktop host 或 network resource。
 *
 * @lang en Verifies HTMDoc's metadata-only HTML-authoring handoff fixtures. This gate reads only fixed HIA-owned JSON fixture files. It does not discover, read, run, or write a target repository, source body, source map body, desktop host, or network resource.
 */

const fs = require("node:fs");
const path = require("node:path");

/**
 * accepted fixture 是唯一 ready input。
 * @lang en The accepted fixture is the only ready input.
 */
const ACCEPTED_FIXTURE = "accepted.request.json";
/**
 * refusal fixture/code pair 证明七个冻结 W-P80 denial family。
 * @lang en Refusal fixture/code pairs prove the seven frozen W-P80 denial families.
 */
const REFUSAL_FIXTURES = Object.freeze([
  ["refused-version.request.json", "HTMDOC_HTML_HANDOFF_VERSION_UNSUPPORTED"],
  ["refused-identity.request.json", "HTMDOC_HTML_HANDOFF_IDENTITY_INVALID"],
  ["refused-conformance.request.json", "HTMDOC_HTML_HANDOFF_CONFORMANCE_UNACCEPTED"],
  ["refused-source-policy.request.json", "HTMDOC_HTML_HANDOFF_SOURCE_POLICY_DENIED"],
  ["refused-private-data.request.json", "HTMDOC_HTML_HANDOFF_PRIVATE_DATA_DENIED"],
  ["refused-map-linkage.request.json", "HTMDOC_HTML_HANDOFF_MAP_LINKAGE_DENIED"],
  ["refused-host-action.request.json", "HTMDOC_HTML_HANDOFF_HOST_ACTION_DENIED"]
]);

/**
 * 运行 fixed fixture gate，且只输出 small boundary summary。
 *
 * @lang en Runs the fixed fixture gate and emits only a small boundary summary.
 *
 * @returns {Promise<void>} <lang><zh-CN>验证完成 promise。</zh-CN><en>Validation-completion promise.</en></lang>
 */
async function checkHtmlAuthoringHandoff() {
  // <lang><zh-CN>root 从 checked-in script location 推导；不接受 caller path，因而不能被用作 target discovery。</zh-CN><en>The root is derived from the checked-in script location; no caller path is accepted, so it cannot be used for target discovery.</en></lang>
  const root = path.resolve(__dirname, "..");
  // <lang><zh-CN>dynamic import 加载 runner public source entry；不加载 host runtime 或 target package。</zh-CN><en>The dynamic import loads the runner public source entry; it loads no host runtime or target package.</en></lang>
  const { createHtmlAuthoringDocumentationHandoff } = await import("../packages/htmdoc-runner/src/index.mjs");
  // <lang><zh-CN>fixture directory 固定在当前 owner repository；其 records 是 metadata-only synthetic inputs。</zh-CN><en>The fixture directory is fixed in the current owner repository; its records are metadata-only synthetic inputs.</en></lang>
  const fixtureDirectory = path.join(root, "fixtures", "html-authoring-handoff");

  // <lang><zh-CN>accepted request 必须得到唯一 allowed status，且不得把 source policy 扩张为 embed/link/fetch。</zh-CN><en>The accepted request must receive the sole allowed status and must not expand source policy to embed/link/fetch.</en></lang>
  const accepted = createHtmlAuthoringDocumentationHandoff(readJson(fixtureDirectory, ACCEPTED_FIXTURE));
  if (accepted.status !== "accepted" || accepted.compatibility?.sourcePolicy !== "none" || accepted.compatibility?.nativeUi !== "not-applicable") {
    throw new Error("HTMDoc HTML-authoring accepted fixture drifted.");
  }
  // <lang><zh-CN>每个 refusal fixture 只断言 expected fixed code；不回显 fixture body 或 any rejected field。</zh-CN><en>Each refusal fixture asserts only its expected fixed code; it never echoes a fixture body or any rejected field.</en></lang>
  for (const [fixtureName, expectedCode] of REFUSAL_FIXTURES) {
    // <lang><zh-CN>evaluator 输入只来自 one explicit fixed JSON file；不会由 data value 继续访问 filesystem。</zh-CN><en>Evaluator input comes only from one explicit fixed JSON file; no filesystem access follows from a data value.</en></lang>
    const report = createHtmlAuthoringDocumentationHandoff(readJson(fixtureDirectory, fixtureName));
    if (report.status !== "refused" || !Array.isArray(report.diagnostics) || !report.diagnostics.some((diagnostic) => diagnostic.code === expectedCode)) {
      throw new Error("HTMDoc HTML-authoring refusal fixture drifted.");
    }
  }
  // <lang><zh-CN>summary 不输出 output/entry/fixture path 或 source text；只保留 countable safety posture。</zh-CN><en>The summary exposes no output/entry/fixture path or source text; it retains only a countable safety posture.</en></lang>
  process.stdout.write(`${JSON.stringify({
    contract: "html-authoring-documentation-handoff@0.1.0-draft",
    status: "ready-for-wp80-closeout",
    acceptedFixtureCount: 1,
    refusalFixtureCount: REFUSAL_FIXTURES.length,
    sourcePolicy: "none-only",
    nativeUi: "not-applicable",
    targetRepositoryRead: false,
    targetRepositoryWrite: false,
    targetCommandExecuted: false,
    targetRuntimeOpened: false,
    tauriIpcIntegration: false,
    obsidianVaultIntegration: false,
    sourceReaderImplemented: false,
    networkAccessed: false,
    packagePublished: false,
    targetAdoptionClaimed: false
  }, null, 2)}\n`);
}

/**
 * 读取一份固定 JSON fixture，并拒绝 non-record root。
 *
 * @lang en Reads one fixed JSON fixture and rejects non-record roots.
 *
 * @param {string} fixtureDirectory <lang><zh-CN>固定 fixture directory。</zh-CN><en>Fixed fixture directory.</en></lang>
 * @param {string} fileName <lang><zh-CN>script constant fixture filename。</zh-CN><en>Script-constant fixture filename.</en></lang>
 * @returns {Record<string, unknown>} <lang><zh-CN>已解析 fixture record。</zh-CN><en>Parsed fixture record.</en></lang>
 */
function readJson(fixtureDirectory, fileName) {
  // <lang><zh-CN>path join 只组合 script constants；任何 fixture 字段都不会作为 path、URL 或 command 使用。</zh-CN><en>The path join combines script constants only; no fixture field is used as a path, URL, or command.</en></lang>
  const value = JSON.parse(fs.readFileSync(path.join(fixtureDirectory, fileName), "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("HTMDoc HTML-authoring fixture must be a record.");
  }
  return value;
}

// <lang><zh-CN>top level 只执行 deterministic owner-local validation；error 不携带 fixture/source/path/target detail。</zh-CN><en>The top level performs deterministic owner-local validation only; errors carry no fixture, source, path, or target detail.</en></lang>
checkHtmlAuthoringHandoff().catch((error) => {
  console.error(error instanceof Error ? error.message : "HTMDoc HTML-authoring handoff check failed.");
  process.exitCode = 1;
});
