const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadReleaseContext } = require("./release-packages.cjs");

/**
 * Verify the public HTMDoc train through anonymous registry metadata and a clean consumer.
 *
 * @lang zh-CN 对八个精确版本逐一验证 registry identity、SHA-512 integrity、SHA-1 兼容摘要、npm provenance/SLSA attestation 链接；随后在空缓存临时项目中安装、导入并运行 runner/producer/隐私 smoke。检查不读取发布令牌。
 * @lang en Verifies registry identity, SHA-512 integrity, the compatibility SHA-1 digest, and npm provenance/SLSA attestation linkage for all eight exact versions; it then installs, imports, and exercises runner/producer/privacy smoke in an empty-cache temporary project. The check never reads a publication token.
 * @returns {Promise<void>} registry 与 consumer 验证完成信号。 / Completion signal for registry and consumer verification.
 * @throws {AssertionError|Error} metadata、attestation、安装、API 或隐私边界漂移时失败。 / Fails on metadata, attestation, install, API, or privacy-boundary drift.
 */
async function main() {
  const { inventory, packages } = loadReleaseContext();
  // <lang><zh-CN>每个 metadata 请求都是匿名精确版本读取；latest dist-tag 不能代替本批次身份。</zh-CN><en>Every metadata request is an anonymous exact-version read; the latest dist-tag cannot substitute for this train's identity.</en></lang>
  const registryReports = [];
  for (const candidate of packages) {
    registryReports.push(await verifyRegistryPackage(inventory.registry, candidate));
  }

  // <lang><zh-CN>consumer 使用独立临时根与空 npm cache，避免 workspace link、开发缓存或登录态污染结论。</zh-CN><en>The consumer uses an independent temporary root and empty npm cache so workspace links, development cache, and login state cannot contaminate the result.</en></lang>
  const consumerReport = runRegistryConsumer(inventory, packages);
  process.stdout.write(`${JSON.stringify({
    status: "public-registry-release-verified",
    packageCount: registryReports.length,
    integrityCount: registryReports.filter((report) => report.integrity).length,
    provenanceCount: registryReports.filter((report) => report.provenance).length,
    importedPackageCount: consumerReport.importedPackageCount,
    artifactCount: consumerReport.artifactCount,
    sourcesContentPolicy: consumerReport.sourcesContentPolicy,
    absolutePathLeakCount: consumerReport.absolutePathLeakCount,
    sourceContentLeakCount: consumerReport.sourceContentLeakCount
  })}\n`);
}

/**
 * Verify exact registry metadata and its public attestation endpoint.
 *
 * @lang zh-CN 只接受 npmjs HTTPS tarball、sha512 integrity 和 SLSA provenance predicate；attestation body 仅检查公开结构与非空声明，不下载源码正文。
 * @lang en Accepts only an npmjs HTTPS tarball, sha512 integrity, and an SLSA provenance predicate; the attestation body is checked only for public structure and non-empty statements, without downloading source bodies.
 * @param {string} registry npm registry 根 URL。 / npm registry base URL.
 * @param {object} candidate 已绑定 manifest 的候选。 / Candidate bound to its manifest.
 * @returns {Promise<{name: string, version: string, integrity: true, provenance: true}>} 稳定核验摘要。 / Stable verification summary.
 */
async function verifyRegistryPackage(registry, candidate) {
  const metadataUrl = new URL(`${encodeURIComponent(candidate.name)}/${encodeURIComponent(candidate.version)}`, registry);
  const response = await fetch(metadataUrl, { headers: { accept: "application/json" } });
  assert.equal(response.status, 200, `${candidate.name}@${candidate.version}: registry returned HTTP ${response.status}.`);
  const metadata = await response.json();
  assert.equal(metadata.name, candidate.name, `${candidate.name}: registry name drifted.`);
  assert.equal(metadata.version, candidate.version, `${candidate.name}: registry version drifted.`);
  assert.match(metadata.dist?.integrity ?? "", /^sha512-[A-Za-z0-9+/]+=*$/, `${candidate.name}: sha512 integrity is missing.`);
  assert.match(metadata.dist?.shasum ?? "", /^[a-f0-9]{40}$/, `${candidate.name}: compatibility shasum is missing.`);
  assert.match(metadata.dist?.tarball ?? "", /^https:\/\/registry\.npmjs\.org\//, `${candidate.name}: tarball host drifted.`);

  // <lang><zh-CN>npm 在 dist.attestations 中公开 provenance predicate 与透明 attestation endpoint；二者必须同时存在。</zh-CN><en>npm exposes the provenance predicate and transparent attestation endpoint in dist.attestations; both must exist together.</en></lang>
  const attestations = metadata.dist?.attestations;
  assert.equal(typeof attestations?.url, "string", `${candidate.name}: npm attestation URL is missing.`);
  assert.match(attestations.url, /^https:\/\/registry\.npmjs\.org\/-\/npm\/v1\/attestations\//, `${candidate.name}: npm attestation URL host or path drifted.`);
  assert.equal(attestations.provenance?.predicateType, "https://slsa.dev/provenance/v1", `${candidate.name}: SLSA provenance predicate drifted.`);
  const attestationResponse = await fetch(attestations.url, { headers: { accept: "application/json" } });
  assert.equal(attestationResponse.status, 200, `${candidate.name}: attestation endpoint returned HTTP ${attestationResponse.status}.`);
  const attestationBody = await attestationResponse.json();
  assert.ok(Array.isArray(attestationBody.attestations) && attestationBody.attestations.length > 0, `${candidate.name}: attestation statements are empty.`);

  return { name: candidate.name, version: candidate.version, integrity: true, provenance: true };
}

/**
 * Install and exercise every exact package in an isolated public-registry consumer.
 *
 * @lang zh-CN consumer manifest 只含 name@version，不含 file/link/workspace；成功后复核已安装 manifest、端到端 API、生成 artifact 与 none 隐私策略。
 * @lang en The consumer manifest contains only name@version entries and no file/link/workspace protocols; after installation it verifies installed manifests, end-to-end APIs, generated artifacts, and the none privacy policy.
 * @param {object} inventory 公开包清单。 / Public-package inventory.
 * @param {object[]} packages 按依赖顺序排列的候选。 / Candidates ordered by dependencies.
 * @returns {{absolutePathLeakCount: number, artifactCount: number, importedPackageCount: number, sourceContentLeakCount: number, sourcesContentPolicy: string}} consumer 摘要。 / Consumer summary.
 */
function runRegistryConsumer(inventory, packages) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hia-htmdoc-registry-"));
  try {
    const consumerRoot = path.join(temporaryRoot, "consumer");
    const cacheRoot = path.join(temporaryRoot, "npm-cache");
    fs.mkdirSync(consumerRoot, { recursive: true });
    fs.mkdirSync(cacheRoot, { recursive: true });
    const dependencies = Object.fromEntries(packages.map((candidate) => [candidate.name, candidate.version]));
    writeJson(path.join(consumerRoot, "package.json"), {
      name: "htmdoc-public-registry-consumer",
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies
    });
    fs.writeFileSync(path.join(consumerRoot, "smoke.mjs"), createConsumerSmokeSource(), "utf8");
    runNpm([
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      cacheRoot,
      `--registry=${inventory.registry}`
    ], consumerRoot, "clean registry consumer install");

    for (const candidate of packages) {
      const installedManifest = readJson(path.join(consumerRoot, "node_modules", ...candidate.name.split("/"), "package.json"));
      assert.equal(installedManifest.name, candidate.name, `${candidate.name}: installed identity drifted.`);
      assert.equal(installedManifest.version, candidate.version, `${candidate.name}: installed version drifted.`);
    }

    const smokeResult = spawnSync(process.execPath, [path.join(consumerRoot, "smoke.mjs")], {
      cwd: consumerRoot,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024
    });
    assert.ifError(smokeResult.error);
    assert.equal(smokeResult.status, 0, `registry consumer smoke failed:\n${smokeResult.stderr || smokeResult.stdout || "no process output"}`);
    const smokeReport = JSON.parse(smokeResult.stdout);
    assert.equal(smokeReport.importedPackageCount, packages.length, "Registry consumer did not import every HTMDoc package.");
    assert.equal(smokeReport.runnerStatus, "success", "Registry consumer runner failed.");
    assert.equal(smokeReport.producerId, "htmdoc", "Registry consumer producer identity drifted.");
    assert.deepEqual(smokeReport.runtimeVersions, [inventory.candidateVersion], "Registry consumer runtime versions drifted.");
    assert.equal(smokeReport.sourcesContentPolicy, "none", "Registry consumer privacy policy drifted.");
    assert.ok(smokeReport.artifactCount >= 3, "Registry consumer emitted too few artifacts.");

    const outputBodies = readTextFilesRecursively(path.join(consumerRoot, "dist", "htmdoc"));
    const sourceBody = "<main data-htmdoc-registry>public registry consumer</main>";
    const absoluteNeedles = [consumerRoot, consumerRoot.replaceAll("\\", "/")];
    const privacyReport = {
      ...smokeReport,
      absolutePathLeakCount: outputBodies.filter((body) => absoluteNeedles.some((needle) => body.includes(needle))).length,
      sourceContentLeakCount: outputBodies.filter((body) => body.includes(sourceBody)).length
    };
    assert.equal(privacyReport.absolutePathLeakCount, 0, "Registry consumer artifacts leaked an absolute consumer path.");
    assert.equal(privacyReport.sourceContentLeakCount, 0, "sourcesContentPolicy=none leaked the registry consumer source body.");
    return privacyReport;
  } finally {
    assertTemporaryBoundary(temporaryRoot);
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

/**
 * Create the ESM smoke program executed outside the repository.
 *
 * @lang zh-CN 生成代码导入八包，并以最小 HTML 输入覆盖 parser、extractor、adapter、source map、runner 与 producer。
 * @lang en Generates code that imports all eight packages and covers parser, extractor, adapter, source map, runner, and producer with minimal HTML input.
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
 * Exercise the registry-installed HTMDoc API with the default privacy policy.
 *
 * @lang zh-CN 只向 stdout 写稳定 JSON 摘要；consumer 绝对路径和 HTML 正文不得进入生成 artifact。
 * @lang en Writes only stable JSON to stdout; neither the consumer absolute path nor the HTML body may enter generated artifacts.
 * @returns {Promise<void>} smoke 完成信号。 / Smoke completion signal.
 */
async function main() {
  const workspaceRoot = process.cwd();
  const outputDirectory = path.join(workspaceRoot, "dist", "htmdoc");
  const sourceDirectory = path.join(workspaceRoot, "src");
  const sourceBody = "<main data-htmdoc-registry>public registry consumer</main>";
  await fs.mkdir(sourceDirectory, { recursive: true });
  await fs.writeFile(path.join(sourceDirectory, "smoke.html"), sourceBody, "utf8");

  const parsed = htmlParser.parseHtml(sourceBody);
  assert.ok(parsed, "html-parser returned no document.");
  const extraction = htmlDocExtractor.extractHtmlDoc(sourceBody, { path: "src/smoke.html", sourcesContentPolicy: "none" });
  const cemExtraction = cemAdapter.cemManifestToHtmlExtraction({ schemaVersion: "1.0.0", modules: [] }, { path: "custom-elements.json" });
  const document = htmlDocAdapter.htmlExtractionToHiaDocument(extraction, { id: "htmdoc:registry-smoke", title: "Registry Smoke" });
  const sourceMap = htmlDocSourceMap.createHtmlDocumentationSourceMap({
    extraction,
    extractionPath: "artifacts/smoke.htmdoc.json",
    hiaDocumentPath: "artifacts/smoke.hia.json",
    sourcesContentPolicy: "none"
  });
  assert.ok(document && sourceMap, "adapter or doc-source-map returned no artifact.");
  assert.equal(cemExtraction.contract, htmdocSpec.HTMDOC_EXTRACTION_CONTRACT);

  const runnerResult = await htmdocRunner.runHtmDoc({
    workspaceRoot,
    outputDirectory,
    inputs: [{ kind: "html", path: "src/smoke.html" }],
    options: { emitDocSourceMap: true, sourcesContentPolicy: "none", writeResultManifest: true },
    profileIds: ["htmdoc"]
  });
  assert.equal(htmdocProducer.descriptor, htmdocProducerDescriptor);
  assert.equal(typeof htmdocProducer.produce, "function");
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

/** @lang zh-CN 通过当前 mise/npm 进程链运行 npm。 @lang en Runs npm through the active mise/npm process lineage. */
function runNpm(npmArgs, cwd, label) {
  const npmCli = process.env.npm_execpath;
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, ...npmArgs], { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })
    : spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", npmArgs, { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${label} failed:\n${result.stderr || result.stdout || "no process output"}`);
  return result;
}

/** @lang zh-CN 读取 UTF-8 JSON。 @lang en Reads UTF-8 JSON. */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/** @lang zh-CN 写入确定性 JSON。 @lang en Writes deterministic JSON. */
function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** @lang zh-CN 只遍历 runner 输出以执行隐私扫描。 @lang en Traverses runner output only for privacy scanning. */
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

/** @lang zh-CN 限定递归清理为本次系统临时子目录。 @lang en Restricts recursive cleanup to this run's OS-temp child. */
function assertTemporaryBoundary(temporaryRoot) {
  const systemTemp = path.resolve(os.tmpdir());
  const resolvedTarget = path.resolve(temporaryRoot);
  assert.notEqual(resolvedTarget, systemTemp, "Cleanup target must not be the OS temp root.");
  assert.equal(path.dirname(resolvedTarget), systemTemp, "Cleanup target must be a direct OS-temp child.");
  assert.ok(path.basename(resolvedTarget).startsWith("hia-htmdoc-registry-"), "Cleanup target prefix drifted.");
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
