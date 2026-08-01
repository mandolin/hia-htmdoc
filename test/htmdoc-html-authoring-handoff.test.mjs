/**
 * HTMDoc HTML-authoring metadata handoff 边界的 synthetic 测试。
 *
 * 测试只使用已提交的 HIA-owned metadata fixture 或临时 HIA-owned copy。
 * 它们绝不发现、读取、运行或写入 target repository 或 desktop host。
 *
 * @lang en Synthetic tests for the HTMDoc HTML-authoring metadata handoff boundary. The tests use checked-in HIA-owned metadata fixtures or temporary HIA-owned copies only. They never discover, read, run, or write a target repository or desktop host.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  HTML_AUTHORING_DOCUMENTATION_HANDOFF_CONTRACT,
  HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION,
  createHtmlAuthoringDocumentationHandoff
} from "../packages/htmdoc-runner/src/index.mjs";

// <lang><zh-CN>repository root 只用于解析本仓 synthetic fixture 与 CLI；它不包含或推导 target path。</zh-CN><en>The repository root resolves this repository's synthetic fixtures and CLI only; it contains and derives no target path.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>fixture directory 是 checked-in metadata-only request 集合，既不是 source discovery root，也不是 output directory。</zh-CN><en>The fixture directory is a checked-in metadata-only request set, neither a source-discovery root nor an output directory.</en></lang>
const fixtureDirectory = path.join(repositoryRoot, "fixtures", "html-authoring-handoff");
// <lang><zh-CN>CLI 通过 repository-local source path 调用，无需 install、local link、target package 或 host runtime。</zh-CN><en>The CLI is called by repository-local source path, requiring no install, local link, target package, or host runtime.</en></lang>
const handoffCliPath = path.join(repositoryRoot, "packages", "htmdoc-runner", "src", "html-authoring-handoff-cli.mjs");

/**
 * 每份 fixture 将一个 frozen refusal family 映射到其 expected public-safe code。
 * @lang en Each fixture maps one frozen refusal family to its expected public-safe code.
 */
const refusalFixtures = Object.freeze([
  ["refused-version.request.json", "HTMDOC_HTML_HANDOFF_VERSION_UNSUPPORTED"],
  ["refused-identity.request.json", "HTMDOC_HTML_HANDOFF_IDENTITY_INVALID"],
  ["refused-conformance.request.json", "HTMDOC_HTML_HANDOFF_CONFORMANCE_UNACCEPTED"],
  ["refused-source-policy.request.json", "HTMDOC_HTML_HANDOFF_SOURCE_POLICY_DENIED"],
  ["refused-private-data.request.json", "HTMDOC_HTML_HANDOFF_PRIVATE_DATA_DENIED"],
  ["refused-map-linkage.request.json", "HTMDOC_HTML_HANDOFF_MAP_LINKAGE_DENIED"],
  ["refused-host-action.request.json", "HTMDOC_HTML_HANDOFF_HOST_ACTION_DENIED"]
]);

test("HTML-authoring handoff accepts deterministic none-only metadata", async () => {
  // <lang><zh-CN>accepted fixture 是唯一 success shape；它的 IDs 是 logical metadata 而非 source path。</zh-CN><en>The accepted fixture is the sole success shape; its IDs are logical metadata rather than source paths.</en></lang>
  const request = await loadFixture("accepted.request.json");
  // <lang><zh-CN>pure evaluator 只接收 parsed object，因此无法执行 target/host/network side effect。</zh-CN><en>The pure evaluator receives only a parsed object and therefore cannot perform target, host, or network side effects.</en></lang>
  const report = createHtmlAuthoringDocumentationHandoff(request);
  // <lang><zh-CN>serialization 证明 output 是报告 projection，而非 fixture/object transport。</zh-CN><en>Serialization proves the output is a report projection rather than fixture/object transport.</en></lang>
  const serialized = JSON.stringify(report);

  assert.equal(report.contract, HTML_AUTHORING_DOCUMENTATION_HANDOFF_CONTRACT);
  assert.equal(report.contractVersion, HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION);
  assert.equal(report.status, "accepted");
  assert.deepEqual(report.output, {
    id: "htmdoc-output:standalone-basic",
    stableEntryIds: ["entry:html-component:status-badge", "entry:html-attribute:status-badge-label"],
    entryCount: 2,
    locale: { value: "und", changesCanonicalIdentity: false }
  });
  assert.equal(report.compatibility.sourcePolicy, "none");
  assert.equal(report.compatibility.nativeUi, "not-applicable");
  assert.equal(report.provenance.ordinaryMapCarriesHandoffModel, false);
  assert.equal(report.permissions.tauriIpcIntegration, false);
  assert.equal(report.permissions.obsidianVaultIntegration, false);
  assert.equal(report.adoption.targetAdoptionClaimed, false);
  assert.doesNotMatch(serialized, /source\.html|artifact|targetId|vaultPath/u);
});

for (const [fixtureName, expectedCode] of refusalFixtures) {
  test(`HTML-authoring handoff refuses ${fixtureName} without reflecting caller input`, async () => {
    // <lang><zh-CN>每次 load 返回 fresh JSON object，避免一个 negative mutation 影响其它 refusal fixture。</zh-CN><en>Each load returns a fresh JSON object, preventing one negative mutation from influencing another refusal fixture.</en></lang>
    const request = await loadFixture(fixtureName);
    // <lang><zh-CN>refusal 仍使用同一 pure evaluator；测试不把 failure 值当作 path、command 或 host request。</zh-CN><en>The refusal uses the same pure evaluator; the test never treats a failure value as a path, command, or host request.</en></lang>
    const report = createHtmlAuthoringDocumentationHandoff(request);
    // <lang><zh-CN>refusal JSON 只能包含 fixed diagnostics 与 all-false boundaries；不能复制 request object。</zh-CN><en>Refusal JSON may contain only fixed diagnostics and all-false boundaries; it cannot copy the request object.</en></lang>
    const serialized = JSON.stringify(report);

    assert.equal(report.status, "refused");
    assert.equal(report.refusal.inputReflected, false);
    assert.equal(report.refusal.outputIdentityReflected, false);
    assert.equal(report.refusal.entryIdentityReflected, false);
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.code === expectedCode));
    assert.ok(Object.values(report.privacy).every((value) => value === false));
    assert.ok(Object.values(report.permissions).every((value) => value === false));
    assert.equal(report.adoption.targetAdoptionClaimed, false);
    assert.equal("output" in report, false);
    assert.doesNotMatch(serialized, /private\\html-authoring-source|0\.1\.1-draft|status-badge/u);
  });
}

test("HTML-authoring handoff CLI writes only an explicit safe-relative report in an HIA-owned temporary directory", async () => {
  // <lang><zh-CN>temporary directory 由 test 创建并在 finally 精确清理，不接触 repository fixture 或 target tree。</zh-CN><en>The temporary directory is created by the test and precisely cleaned in finally; it touches neither a repository fixture nor a target tree.</en></lang>
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "htmdoc-handoff-cli-"));
  // <lang><zh-CN>accepted request 是 metadata-only copy；input/output filename 均相对于 temporary cwd。</zh-CN><en>The accepted request is a metadata-only copy; input/output filenames are both relative to the temporary cwd.</en></lang>
  const request = await loadFixture("accepted.request.json");
  const inputPath = path.join(temporaryDirectory, "handoff-input.json");
  const outputPath = path.join(temporaryDirectory, "handoff-report.json");

  try {
    await writeFile(inputPath, `${JSON.stringify(request)}\n`, "utf8");
    // <lang><zh-CN>spawned CLI 只读取 one explicit temporary JSON 并只写 requested temporary output。</zh-CN><en>The spawned CLI reads only one explicit temporary JSON file and writes only the requested temporary output.</en></lang>
    const execution = spawnSync(process.execPath, [handoffCliPath, "--input", "handoff-input.json", "--out", "handoff-report.json"], {
      cwd: temporaryDirectory,
      encoding: "utf8"
    });
    // <lang><zh-CN>result 只从同一 temporary directory 读取，以验证 safe-relative write 而不依赖 repository output。</zh-CN><en>The result is read only from the same temporary directory, verifying the safe-relative write without relying on repository output.</en></lang>
    const report = JSON.parse(await readFile(outputPath, "utf8"));

    assert.equal(execution.status, 0, execution.stderr);
    assert.equal(report.status, "accepted");
    assert.equal(report.output.id, "htmdoc-output:standalone-basic");
  } finally {
    // <lang><zh-CN>只删除 mkdtemp 返回的 exact path；绝不清理 workspace、target 或 user directory。</zh-CN><en>Delete only the exact path returned by mkdtemp; never clean a workspace, target, or user directory.</en></lang>
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("HTML-authoring handoff CLI rejects traversal output before it can escape the invocation directory", async () => {
  // <lang><zh-CN>独立 temporary directory 使 traversal test 不需要检查或修改任何 repository path。</zh-CN><en>An independent temporary directory lets the traversal test avoid inspecting or modifying any repository path.</en></lang>
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "htmdoc-handoff-cli-path-"));
  // <lang><zh-CN>input fixture 仍是 accepted metadata；只改变 CLI output option，不改变 evaluator boundary。</zh-CN><en>The input fixture remains accepted metadata; only the CLI output option changes, not the evaluator boundary.</en></lang>
  const request = await loadFixture("accepted.request.json");

  try {
    await writeFile(path.join(temporaryDirectory, "handoff-input.json"), `${JSON.stringify(request)}\n`, "utf8");
    // <lang><zh-CN>traversal 在 writeFile 前拒绝，因此 test 不尝试探测 invocation directory 之外的 file existence。</zh-CN><en>Traversal is refused before writeFile, so the test does not probe file existence outside the invocation directory.</en></lang>
    const execution = spawnSync(process.execPath, [handoffCliPath, "--input", "handoff-input.json", "--out", "../outside.json"], {
      cwd: temporaryDirectory,
      encoding: "utf8"
    });

    assert.equal(execution.status, 1);
    assert.match(execution.stderr, /--out must be a safe relative path\./u);
  } finally {
    // <lang><zh-CN>cleanup 仅处理 test own temporary directory。</zh-CN><en>Cleanup handles the test's own temporary directory only.</en></lang>
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

/**
 * 按 fixed fixture name 加载一份已提交 synthetic metadata request。
 *
 * @lang en Loads one checked-in synthetic metadata request by its fixed fixture name.
 *
 * @param {string} fileName <lang><zh-CN>受控 fixture filename。</zh-CN><en>Controlled fixture filename.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>fresh parsed request object。</zh-CN><en>Fresh parsed request object.</en></lang>
 */
async function loadFixture(fileName) {
  // <lang><zh-CN>fileName 仅来自 test constants；此 helper 不接受 CLI/user input，也不会遍历 fixture directory。</zh-CN><en>The filename comes only from test constants; this helper accepts no CLI/user input and does not traverse the fixture directory.</en></lang>
  const fixtureText = await readFile(path.join(fixtureDirectory, fileName), "utf8");
  return JSON.parse(fixtureText);
}
