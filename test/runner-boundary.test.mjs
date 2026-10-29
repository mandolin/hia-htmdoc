/**
 * @file Declared runner types and public failure regression checks.
 * @lang zh-CN 对既有 schema 类型及 CLI/生产器公开失败边界先补真实反例；不更改旧配置身份。
 * @lang en Adds real regressions for existing schema types and CLI/producer public failures without changing legacy config identity.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import producer from "../packages/htmdoc-producer/src/index.mjs";
import { evaluateHtmDocOutputConformance } from "../packages/htmdoc-spec/src/index.mjs";
import { loadHtmDocConfig, runHtmDoc } from "../packages/htmdoc-runner/src/index.mjs";

/** @lang zh-CN 唯一的哨兵文本用于证明失败不回显私有原文。 @lang en A unique sentinel proves failures do not echo private input. */
const PRIVATE = "private-runner-boundary-sentinel";
/** @lang zh-CN 精确定位本仓 CLI，避免调用系统安装版本。 @lang en Resolves this repository's CLI rather than a globally installed version. */
const cli = fileURLToPath(new URL("../packages/htmdoc-runner/src/cli.mjs", import.meta.url));
/** @lang zh-CN 第二个公开 bin 的精确源码路径。 @lang en Exact source path of the second public binary. */
const handoffCli = fileURLToPath(new URL("../packages/htmdoc-runner/src/html-authoring-handoff-cli.mjs", import.meta.url));

/**
 * @param {Function} callback <lang><zh-CN>接收隔离根和合法基础请求的测试。</zh-CN><en>Test receiving an isolated root and valid baseline request.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>测试完成且自有临时目录已回收。</zh-CN><en>Completes the test and removes its owned temporary directory.</en></lang>
 * @lang zh-CN 只创建和清理本测试 mkdtemp 返回的路径，不访问业务仓。
 * @lang en Creates and removes only the path returned by this test's mkdtemp, never a business repository.
 */
async function withWorkspace(callback) {
  // <lang><zh-CN>每个用例独立拥有根目录，便于证明拒绝前没有输出副作用。</zh-CN><en>Each case owns its root so rejection can prove there were no output effects.</en></lang>
  const root = await mkdtemp(path.join(tmpdir(), "htmdoc-boundary-"));
  try {
    await writeFile(path.join(root, "input.html"), "<!-- @component card -->\n<section></section>");
    await callback(root, {
      workspaceRoot: root,
      outputDirectory: path.join(root, "out"),
      inputs: [{ path: "input.html" }]
    });
  } finally {
    assert.equal(path.dirname(root), tmpdir());
    assert.ok(path.basename(root).startsWith("htmdoc-boundary-"));
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * @param {object} request <lang><zh-CN>应在写盘前拒绝的请求。</zh-CN><en>Request to reject before any write.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>验证固定 TypeError 与输出未创建。</zh-CN><en>Checks a redacted TypeError and absence of output.</en></lang>
 */
async function rejectsBeforeOutput(request) {
  await assert.rejects(() => runHtmDoc(request), (error) => {
    assert.ok(error instanceof TypeError);
    assert.equal(String(error).includes(PRIVATE), false);
    return true;
  });
  await assert.rejects(access(request.outputDirectory), { code: "ENOENT" });
}

// <lang><zh-CN>已声明的两个布尔选项不得用真值转换或 null 默认绕开类型。</zh-CN><en>Neither declared boolean may bypass typing through truthiness or null defaults.</en></lang>
for (const option of ["emitDocSourceMap", "writeResultManifest"] ) {
  for (const value of [PRIVATE, 0, null]) {
    test(`runner rejects non-boolean ${option}: ${typeof value}`, async () => {
      await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, options: { [option]: value } }));
    });
  }
}
// <lang><zh-CN>已存在的可选对象与数组不能把显式 null 当成缺省。</zh-CN><en>Existing optional records and arrays cannot treat explicit null as omission.</en></lang>
for (const field of ["options", "profileIds"]) {
  test(`runner rejects null ${field}`, async () => {
    await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, [field]: null }));
  });
}
test("runner rejects duplicate profile identifiers", async () => {
  await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, profileIds: ["htmdoc", "htmdoc"] }));
});
// <lang><zh-CN>输入 language 一旦提供，必须是非空字符串，不能被静默丢弃。</zh-CN><en>An explicitly supplied language must be a nonempty string and cannot be silently discarded.</en></lang>
for (const language of [null, 42, false, ""]) {
  test(`runner rejects invalid input language: ${typeof language}`, async () => {
    await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, inputs: [{ path: "input.html", language }] }));
  });
}
test("runner does not echo unknown option names", async () => {
  await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, options: { [PRIVATE]: true } }));
});
test("runner does not echo unknown input keys", async () => {
  await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, inputs: [{ path: "input.html", [PRIVATE]: true }] }));
});
test("runner does not echo rejected kinds", async () => {
  await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, inputs: [{ path: "input.html", kind: PRIVATE }] }));
});
test("runner rejects explicitly null input kind", async () => {
  await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, inputs: [{ path: "input.html", kind: null }] }));
});
test("runner does not echo rejected source policies", async () => {
  await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, options: { sourcesContentPolicy: PRIVATE } }));
});
test("runner rejects explicitly null source policy", async () => {
  await withWorkspace(async (_root, request) => rejectsBeforeOutput({ ...request, options: { sourcesContentPolicy: null } }));
});
// <lang><zh-CN>目录默认值只适用于省略，显式 null 违反旧 schema 的 string 声明。</zh-CN><en>Directory defaults apply only to omission; explicit null violates the legacy schema's string declaration.</en></lang>
for (const field of ["workspaceRoot", "outputDirectory"]) {
  test(`config rejects explicitly null ${field}`, async () => {
    await withWorkspace(async (root) => {
      // <lang><zh-CN>创建合法旧配置对照，仅把指定目录置 null。</zh-CN><en>Create a valid legacy config control with only the selected directory set to null.</en></lang>
      const config = path.join(root, "config.json");
      await writeFile(config, JSON.stringify({ schemaVersion: "0.1.0-draft", inputs: [{ path: "input.html" }], [field]: null }));
      await assert.rejects(() => loadHtmDocConfig(config), TypeError);
      await assert.rejects(access(path.join(root, "dist")), { code: "ENOENT" });
    });
  });
}
// <lang><zh-CN>文件读取与 JSON 语法错误均不得通过 loader 异常回显私有定位器或原文。</zh-CN><en>Neither read nor JSON syntax failures may echo private locators or text through loader errors.</en></lang>
for (const mode of ["missing", "malformed", "unknown-key"]) {
  test(`config loader redacts ${mode} failure`, async () => {
    await withWorkspace(async (root) => {
      // <lang><zh-CN>哨兵既放文件名也放 JSON，覆盖两种原始异常来源。</zh-CN><en>The sentinel appears in both filename and JSON to cover both raw exception sources.</en></lang>
      const config = path.join(root, `${PRIVATE}.json`);
      if (mode !== "missing") {
        await writeFile(config, mode === "malformed" ? `{"${PRIVATE}": }` : JSON.stringify({ schemaVersion: "0.1.0-draft", [PRIVATE]: true }));
      }
      await assert.rejects(() => loadHtmDocConfig(config), (error) => {
        assert.equal(String(error).includes(PRIVATE), false);
        assert.equal(String(error).includes(root), false);
        return true;
      });
    });
  });
}
// <lang><zh-CN>参数解析也在同一 CLI 失败边界；stderr 不含 argv、JSON 或堆栈。</zh-CN><en>Argument parsing shares the CLI failure boundary; stderr excludes argv, JSON and stacks.</en></lang>
for (const args of [[`--${PRIVATE}`], ["--kind", PRIVATE, "input.html"], ["--config", `${PRIVATE}.json`]]) {
  test(`CLI redacts ${args[0]} failure`, async () => {
    await withWorkspace(async (root) => {
      // <lang><zh-CN>同步子进程复用当前 Node，捕获两输出流检查公开失败。</zh-CN><en>The synchronous child reuses this Node and captures both streams for public failure checks.</en></lang>
      const child = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });
      assert.equal(child.status, 1);
      assert.equal(`${child.stdout}${child.stderr}`.includes(PRIVATE), false);
      assert.equal(child.stderr.includes("\n    at "), false);
      assert.match(child.stderr, /HTMDoc failed:/);
    });
  });
}
// <lang><zh-CN>第二个 bin 的 native 参数解析不得绕过既有 safeErrorMessage。</zh-CN><en>The second binary's native parsing must not bypass its existing safeErrorMessage.</en></lang>
for (const args of [[`--${PRIVATE}`], ["--input"], ["--input", `${PRIVATE}.json`]]) {
  test(`handoff CLI redacts ${args.join(" ")} failure`, async () => {
    await withWorkspace(async (root) => {
      // <lang><zh-CN>不提供目标仓路径，仅测试本例创建的隔离目录。</zh-CN><en>No target repository path is provided; only the isolated case directory is used.</en></lang>
      const child = spawnSync(process.execPath, [handoffCli, ...args], { cwd: root, encoding: "utf8" });
      assert.equal(child.status, 1);
      assert.equal(`${child.stdout}${child.stderr}`.includes(PRIVATE), false);
      assert.equal(child.stderr.includes("\n    at "), false);
      assert.match(child.stderr, /HTMDoc handoff failed:/);
    });
  });
}
test("producer and persisted result adopt confirmed SDK 1.0.0", async () => {
  await withWorkspace(async (_root, request) => {
    // <lang><zh-CN>读取真实落盘清单，避免只断言内存对象的版本。</zh-CN><en>Read the actual persisted manifest rather than checking only an in-memory version.</en></lang>
    const result = await producer.produce(request);
    assert.equal(producer.descriptor.contractVersion, "1.0.0");
    assert.equal(result.contractVersion, "1.0.0");
    assert.equal(result.status, "success");
    assert.equal(result.artifacts.length, 3);
    assert.deepEqual(JSON.parse(await readFile(path.join(request.outputDirectory, "htmdoc.producer-result.json"), "utf8")), result);
  });
});
test("valid false options and distinct profiles preserve existing generation", async () => {
  await withWorkspace(async (_root, request) => {
    // <lang><zh-CN>合法 false 必须实际关闭输出，而不是为修负例破坏既有开关。</zh-CN><en>Valid false must really disable outputs; fixing negatives must not break existing switches.</en></lang>
    const result = await runHtmDoc({ ...request, profileIds: ["htmdoc", "public"], options: { emitDocSourceMap: false, writeResultManifest: false } });
    assert.equal(result.status, "success");
    assert.equal(result.artifacts.length, 2);
    assert.deepEqual(result.artifacts[0].profileIds, ["htmdoc", "public"]);
    await assert.rejects(access(path.join(request.outputDirectory, "htmdoc.producer-result.json")), { code: "ENOENT" });
  });
});
// <lang><zh-CN>输出一致性读者须同步接受已确认 SDK 身份并保留旧读，未知未来版本仍拒绝。</zh-CN><en>The conformance reader must accept the confirmed SDK identity and retain legacy reads while refusing unknown future versions.</en></lang>
for (const contractVersion of ["0.1.0-draft", "1.0.0", "9.0.0"]) {
  test(`output conformance handles exact result version ${contractVersion}`, async () => {
    await withWorkspace(async (_root, request) => {
      // <lang><zh-CN>生成实际文件后按清单读取，唯一变体是待测结果版本。</zh-CN><en>Read actual generated files by the manifest; the result version is the only test variant.</en></lang>
      const producerResult = await runHtmDoc(request);
      const bundle = { producerResult: { ...producerResult, contractVersion } };
      for (const [field, kind] of [["extraction", "htmdoc-extraction"], ["document", "hia-document"], ["docSourceMap", "doc-source-map"]]) {
        bundle[field] = JSON.parse(await readFile(path.join(request.outputDirectory, producerResult.artifacts.find((artifact) => artifact.kind === kind).path), "utf8"));
      }
      assert.equal(evaluateHtmDocOutputConformance(bundle).conformant, contractVersion !== "9.0.0");
    });
  });
}
