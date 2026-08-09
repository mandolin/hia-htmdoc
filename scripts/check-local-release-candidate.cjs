const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadReleaseContext } = require("./release-packages.cjs");

/**
 * Validate real HTMDoc tarballs in an isolated, offline consumer.
 *
 * @lang zh-CN 实际打包八个候选及两个已审计 parser 支撑包，在全新临时项目中离线安装并导入所有公开包，再运行 runner/producer/隐私 smoke。
 * @lang en Actually packs eight candidates plus two audited parser support packages, installs them offline in a fresh temporary project, imports every public package, and runs runner/producer/privacy smoke checks.
 * @returns {void} 成功时只输出与临时路径无关的确定性摘要。 / On success, writes only a deterministic summary independent of temporary paths.
 * @throws {AssertionError|Error} 打包、离线安装、导入、运行或隐私检查失败时抛出。 / Thrown when packing, offline installation, imports, execution, or privacy checks fail.
 */
function main() {
  const { inventory, packages, root } = loadReleaseContext();
  // <lang><zh-CN>临时根由系统 API 创建并在 finally 中清理，不复用开发 workspace 的 node_modules。</zh-CN><en>The temporary root is created through the system API and cleaned in finally; it never reuses the development workspace node_modules.</en></lang>
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hia-htmdoc-local-rc-"));

  try {
    const packDirectory = path.join(temporaryRoot, "packs");
    const consumerDirectory = path.join(temporaryRoot, "consumer");
    const npmCacheDirectory = path.join(temporaryRoot, "npm-cache");
    fs.mkdirSync(packDirectory, { recursive: true });
    fs.mkdirSync(consumerDirectory, { recursive: true });
    fs.mkdirSync(npmCacheDirectory, { recursive: true });

    // <lang><zh-CN>每个 HIA 包都从候选目录生成真实 tarball，消费测试不允许 workspace link 偷渡。</zh-CN><en>Every HIA package is turned into a real tarball from its candidate directory; workspace links cannot leak into the consumer test.</en></lang>
    const tarballs = new Map();
    for (const candidate of packages) {
      tarballs.set(candidate.name, packPackage(path.join(root, candidate.directory), packDirectory, root));
    }

    // <lang><zh-CN>parse5 与 entities 已在 THIRD_PARTY_NOTICES 中审计；本地 tarball 仅用于让空缓存安装保持真正离线。</zh-CN><en>parse5 and entities are audited in THIRD_PARTY_NOTICES; their local tarballs exist only to keep the empty-cache installation genuinely offline.</en></lang>
    const supportPackageRoots = [
      path.join(root, "packages", "html-parser", "node_modules", "parse5"),
      path.join(root, "packages", "html-parser", "node_modules", "entities")
    ];
    for (const supportRoot of supportPackageRoots) {
      const supportManifest = readJson(path.join(supportRoot, "package.json"));
      tarballs.set(supportManifest.name, packPackage(supportRoot, packDirectory, root));
    }

    // <lang><zh-CN>消费 manifest 显式列出十个本地 tarball；安装后的 HIA manifest 仍必须只含精确 semver 内部依赖。</zh-CN><en>The consumer manifest explicitly lists ten local tarballs; installed HIA manifests must still contain exact-semver internal dependencies only.</en></lang>
    const consumerDependencies = Object.fromEntries(
      [...tarballs.entries()].map(([name, tarballPath]) => [name, `file:${normalizeJsonPath(tarballPath)}`])
    );
    writeJson(path.join(consumerDirectory, "package.json"), {
      name: "htmdoc-local-release-candidate-consumer",
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies: consumerDependencies
    });
    fs.writeFileSync(path.join(consumerDirectory, "smoke.mjs"), createConsumerSmokeSource(), "utf8");

    const installResult = runNpm([
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      npmCacheDirectory
    ], consumerDirectory);
    assertProcessSucceeded(installResult, "offline consumer install");

    // <lang><zh-CN>已安装 manifest 是验证对象；消费根的 file: 输入不能掩盖包内 workspace/file/link 协议。</zh-CN><en>Installed manifests are the validation target; file: inputs at the consumer root cannot hide workspace/file/link protocols inside packages.</en></lang>
    let internalDependencyCount = 0;
    for (const candidate of packages) {
      const installedManifestPath = path.join(consumerDirectory, "node_modules", ...candidate.name.split("/"), "package.json");
      const installedManifest = readJson(installedManifestPath);
      assert.equal(installedManifest.name, candidate.name, `${candidate.name} installed identity drifted.`);
      assert.equal(installedManifest.version, inventory.candidateVersion, `${candidate.name} installed version drifted.`);
      for (const [dependencyName, dependencyVersion] of Object.entries(installedManifest.dependencies ?? {})) {
        if (!dependencyName.startsWith("@hia-doc/")) {
          continue;
        }
        internalDependencyCount += 1;
        assert.equal(dependencyVersion, inventory.candidateVersion, `${candidate.name} installed dependency ${dependencyName} is not exact.`);
        assert.ok(!/^(?:file|link|workspace):/i.test(dependencyVersion), `${candidate.name} leaked a local protocol for ${dependencyName}.`);
      }
    }

    const smokeResult = spawnSync(process.execPath, [path.join(consumerDirectory, "smoke.mjs")], {
      cwd: consumerDirectory,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024
    });
    assertProcessSucceeded(smokeResult, "consumer API smoke");
    const smokeReport = JSON.parse(smokeResult.stdout);
    assert.equal(smokeReport.importedPackageCount, packages.length, "Consumer did not import all public HTMDoc packages.");
    assert.equal(smokeReport.runnerStatus, "success", "Consumer runner smoke did not succeed.");
    assert.equal(smokeReport.producerId, "htmdoc", "Consumer producer descriptor drifted.");
    assert.deepEqual(smokeReport.runtimeVersions, [inventory.candidateVersion], "Runtime provenance did not align with the package candidate version.");
    assert.equal(smokeReport.sourcesContentPolicy, "none", "Consumer smoke must retain the default privacy policy.");
    assert.ok(smokeReport.artifactCount >= 3, "Consumer runner smoke did not emit the expected artifact family.");

    const outputDirectory = path.join(consumerDirectory, "dist", "htmdoc");
    const generatedBodies = readTextFilesRecursively(outputDirectory);
    const absoluteNeedles = [consumerDirectory, normalizeJsonPath(consumerDirectory)];
    const sourceBody = "<main data-htmdoc-smoke>local release candidate</main>";
    const absolutePathLeakCount = generatedBodies.filter((body) => absoluteNeedles.some((needle) => body.includes(needle))).length;
    const sourceContentLeakCount = generatedBodies.filter((body) => body.includes(sourceBody)).length;
    assert.equal(absolutePathLeakCount, 0, "Generated artifacts leaked the consumer absolute path.");
    assert.equal(sourceContentLeakCount, 0, "sourcesContentPolicy=none leaked the HTML source body.");

    process.stdout.write(`${JSON.stringify({
      status: "local-release-candidate-consumable",
      packageCount: packages.length,
      supportPackageCount: supportPackageRoots.length,
      internalDependencyCount,
      artifactCount: smokeReport.artifactCount,
      sourcesContentPolicy: smokeReport.sourcesContentPolicy,
      absolutePathLeakCount,
      sourceContentLeakCount
    })}\n`);
  } finally {
    // <lang><zh-CN>删除前再次证明目标是本次创建的系统临时子目录，避免宽泛递归删除。</zh-CN><en>Prove again that the target is the system temporary child created by this run before recursive cleanup.</en></lang>
    assertTemporaryBoundary(temporaryRoot);
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

/**
 * Pack one package directory through the active npm CLI.
 *
 * @lang zh-CN 返回 npm 报告的唯一 tarball 绝对路径，并拒绝多包或缺失输出。
 * @lang en Returns the sole tarball path reported by npm and rejects multiple or missing outputs.
 * @param {string} packageRoot 包目录。 / Package directory.
 * @param {string} packDirectory tarball 输出目录。 / Tarball output directory.
 * @param {string} cwd npm 工作目录。 / npm working directory.
 * @returns {string} tarball 绝对路径。 / Absolute tarball path.
 */
function packPackage(packageRoot, packDirectory, cwd) {
  const result = runNpm(["pack", packageRoot, "--pack-destination", packDirectory, "--json"], cwd);
  assertProcessSucceeded(result, `pack ${path.basename(packageRoot)}`);
  const packReports = JSON.parse(result.stdout);
  assert.equal(packReports.length, 1, `Expected one tarball for ${packageRoot}.`);
  const tarballPath = path.join(packDirectory, packReports[0].filename);
  assert.ok(fs.statSync(tarballPath).isFile(), `npm did not create ${packReports[0].filename}.`);
  return tarballPath;
}

/**
 * Build the isolated consumer program.
 *
 * @lang zh-CN 生成代码导入全部八包，并用普通 HTML 输入覆盖 parser、extractor、adapter、source map、runner 与 producer 表面。
 * @lang en Generates code that imports all eight packages and covers parser, extractor, adapter, source-map, runner, and producer surfaces with ordinary HTML input.
 * @returns {string} UTF-8 ESM 源码。 / UTF-8 ESM source.
 */
function createConsumerSmokeSource() {
  return `import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import * as cemAdapter from "@hia-doc/cem-adapter";
import * as htmlDocAdapter from "@hia-doc/html-doc-adapter";
import * as htmlDocExtractor from "@hia-doc/html-doc-extractor";
import * as htmlDocSourceMap from "@hia-doc/html-doc-source-map";
import * as htmlParser from "@hia-doc/html-parser";
import htmdocProducer, { htmdocProducerDescriptor } from "@hia-doc/htmdoc-producer";
import * as htmdocRunner from "@hia-doc/htmdoc-runner";
import * as htmdocSpec from "@hia-doc/htmdoc-spec";

/**
 * Exercise the packed HTMDoc public API from a consumer-only project.
 *
 * @lang zh-CN 使用 none 隐私策略运行一个最小 HTML 工程，并只向 stdout 返回稳定摘要。
 * @lang en Runs one minimal HTML project with the none privacy policy and returns only a stable summary on stdout.
 * @returns {Promise<void>} smoke 完成信号。 / Smoke completion signal.
 */
async function main() {
  // <lang><zh-CN>所有路径都属于隔离 consumer；生成结果不得回显这些绝对路径。</zh-CN><en>All paths belong to the isolated consumer; generated results must not echo these absolute paths.</en></lang>
  const workspaceRoot = process.cwd();
  const outputDirectory = path.join(workspaceRoot, "dist", "htmdoc");
  const sourceDirectory = path.join(workspaceRoot, "src");
  const sourceBody = "<main data-htmdoc-smoke>local release candidate</main>";
  await fs.mkdir(sourceDirectory, { recursive: true });
  await fs.writeFile(path.join(sourceDirectory, "smoke.html"), sourceBody, "utf8");

  const parsed = htmlParser.parseHtml(sourceBody);
  assert.ok(parsed, "html-parser returned no document.");
  const extraction = htmlDocExtractor.extractHtmlDoc(sourceBody, { path: "src/smoke.html", sourcesContentPolicy: "none" });
  const cemExtraction = cemAdapter.cemManifestToHtmlExtraction({ schemaVersion: "1.0.0", modules: [] }, { path: "custom-elements.json" });
  const document = htmlDocAdapter.htmlExtractionToHiaDocument(extraction, { id: "htmdoc:smoke", title: "Smoke" });
  const sourceMap = htmlDocSourceMap.createHtmlDocumentationSourceMap({
    extraction,
    extractionPath: "artifacts/smoke.htmdoc.json",
    hiaDocumentPath: "artifacts/smoke.hia.json",
    sourcesContentPolicy: "none"
  });
  assert.ok(document && sourceMap, "adapter or doc-source-map returned no artifact.");
  assert.equal(cemExtraction.contract, htmdocSpec.HTMDOC_EXTRACTION_CONTRACT);
  assert.equal(typeof htmdocSpec.HTMDOC_EXTRACTION_CONTRACT, "string");

  const runnerResult = await htmdocRunner.runHtmDoc({
    workspaceRoot,
    outputDirectory,
    inputs: [{ kind: "html", path: "src/smoke.html" }],
    options: { emitDocSourceMap: true, sourcesContentPolicy: "none", writeResultManifest: true },
    profileIds: ["htmdoc"]
  });
  assert.equal(htmdocProducer.descriptor, htmdocProducerDescriptor);
  assert.equal(typeof htmdocProducer.produce, "function");

  // <lang><zh-CN>实现 provenance 必须统一为候选包版本；draft contract version 不参与此集合。</zh-CN><en>Implementation provenance must converge on the candidate package version; draft contract versions do not belong to this set.</en></lang>
  const runtimeVersions = [...new Set([
    extraction.producer.version,
    cemExtraction.producer.version,
    sourceMap.producer.version,
    runnerResult.producer.version,
    htmdocProducerDescriptor.version
  ])].sort();

  process.stdout.write(JSON.stringify({
    importedPackageCount: 8,
    runnerStatus: runnerResult.status,
    producerId: htmdocProducerDescriptor.id,
    runtimeVersions,
    artifactCount: runnerResult.artifacts.length,
    sourcesContentPolicy: sourceMap.sources[0].sourcesContentPolicy
  }));
}

await main();
`;
}

/**
 * Run npm with the mise-selected Node/npm process lineage.
 *
 * @lang zh-CN npm script 中复用 `npm_execpath`，从而让所有子命令保持当前 mise 工具链。
 * @lang en Reuses `npm_execpath` inside npm scripts so every subcommand stays on the active mise toolchain.
 * @param {string[]} npmArgs npm 参数。 / npm arguments.
 * @param {string} cwd 工作目录。 / Working directory.
 * @returns {import("node:child_process").SpawnSyncReturns<string>} 进程结果。 / Process result.
 */
function runNpm(npmArgs, cwd) {
  const npmCli = process.env.npm_execpath;
  if (npmCli) {
    return spawnSync(process.execPath, [npmCli, ...npmArgs], { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  }
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(command, npmArgs, { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
}

/**
 * Assert a child process completed successfully without exposing expected temporary paths.
 *
 * @lang zh-CN 失败时保留 npm/Node 诊断，成功路径不输出子进程噪声。
 * @lang en Preserves npm/Node diagnostics on failure while suppressing child-process noise on success.
 * @param {import("node:child_process").SpawnSyncReturns<string>} result 进程结果。 / Process result.
 * @param {string} label 稳定步骤标签。 / Stable step label.
 * @returns {void}
 */
function assertProcessSucceeded(result, label) {
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${label} failed:\n${result.stderr || result.stdout || "no process output"}`);
}

/**
 * Read every regular output file as UTF-8 for privacy scanning.
 *
 * @lang zh-CN 仅遍历 runner 输出目录，不读取 consumer 输入或依赖树。
 * @lang en Traverses only the runner output directory and reads neither consumer inputs nor the dependency tree.
 * @param {string} directory 输出目录。 / Output directory.
 * @returns {string[]} 文本正文集合。 / Text body collection.
 */
function readTextFilesRecursively(directory) {
  const bodies = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      bodies.push(...readTextFilesRecursively(entryPath));
    } else if (entry.isFile()) {
      bodies.push(fs.readFileSync(entryPath, "utf8"));
    }
  }
  return bodies;
}

/**
 * Verify a cleanup target remains a child of the OS temp directory.
 *
 * @lang zh-CN 限定删除对象必须以本检查专用前缀开头且不能等于系统临时根。
 * @lang en Restricts cleanup to this check's dedicated prefix and forbids the OS temporary root itself.
 * @param {string} temporaryRoot 待清理目录。 / Directory to clean.
 * @returns {void}
 */
function assertTemporaryBoundary(temporaryRoot) {
  const systemTemp = path.resolve(os.tmpdir());
  const resolvedTarget = path.resolve(temporaryRoot);
  assert.notEqual(resolvedTarget, systemTemp, "Cleanup target must not be the OS temp root.");
  assert.equal(path.dirname(resolvedTarget), systemTemp, "Cleanup target must be a direct child of the OS temp root.");
  assert.ok(path.basename(resolvedTarget).startsWith("hia-htmdoc-local-rc-"), "Cleanup target must use the local RC prefix.");
}

/**
 * Read one JSON file.
 *
 * @lang zh-CN 保持 manifest 解析边界显式。 / Keeps the manifest parsing boundary explicit.
 * @lang en Keeps the manifest parsing boundary explicit.
 * @param {string} filePath JSON 路径。 / JSON path.
 * @returns {object} 解析值。 / Parsed value.
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Write deterministic two-space JSON.
 *
 * @lang zh-CN 消费 manifest 使用稳定换行，便于失败现场复现。
 * @lang en Uses stable indentation and a trailing newline so a failed consumer can be reproduced.
 * @param {string} filePath JSON 路径。 / JSON path.
 * @param {object} value JSON object。 / JSON object.
 * @returns {void}
 */
function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * Normalize an absolute path for a JSON file dependency.
 *
 * @lang zh-CN 仅改变分隔符，不缩短或扩大路径权限边界。
 * @lang en Changes separators only and neither narrows nor broadens the path authority boundary.
 * @param {string} value 文件路径。 / File path.
 * @returns {string} 正斜杠路径。 / Forward-slash path.
 */
function normalizeJsonPath(value) {
  return value.replaceAll("\\", "/");
}

main();
