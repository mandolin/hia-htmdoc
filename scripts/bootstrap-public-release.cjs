const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadReleaseContext } = require("./release-packages.cjs");

/**
 * Publish the approved HTMDoc first-release train from a GitHub-hosted runner.
 *
 * @lang zh-CN 首发器只接受清单中的八包和精确版本。默认仅做匿名 registry 预检；`--publish` 必须处于 GitHub-hosted main workflow，并使用专用临时令牌。若 registry 已出现部分批次，必须人工核验后显式传入 `--resume`。
 * @lang en The bootstrapper accepts only the eight inventoried packages at exact versions. Its default mode performs anonymous registry preflight only; `--publish` requires the GitHub-hosted main workflow and a dedicated temporary token. A partial registry batch requires independent review and an explicit `--resume`.
 * @returns {Promise<void>} 发布或只读预检完成信号。 / Completion signal for publication or read-only preflight.
 * @throws {AssertionError|Error} 身份、状态、runner、registry 或 npm 子进程不满足约束时失败。 / Fails when identity, state, runner, registry, or an npm subprocess violates the contract.
 */
async function main() {
  // <lang><zh-CN>所有包身份和依赖优先序均来自唯一清单，不允许 workflow 复制第二份列表。</zh-CN><en>Every package identity and dependency-first order comes from the sole inventory; the workflow cannot duplicate another list.</en></lang>
  const { inventory, packages, root } = loadReleaseContext();
  // <lang><zh-CN>开关默认无写入；resume 不是自动容错，而是部分批次经外部核验后的显式授权。</zh-CN><en>The switches default to no write; resume is explicit authorization after external verification of a partial batch, not automatic error recovery.</en></lang>
  const execute = process.argv.includes("--publish");
  const resume = process.argv.includes("--resume");

  assert.equal(inventory.releaseStatus, "publish-approved", "HTMDoc bootstrap requires a publish-approved train.");
  assert.equal(inventory.trustedPublisher?.firstPublishBootstrap, "github-actions-temporary-granular-token", "HTMDoc bootstrap strategy drifted.");
  assert.equal(inventory.bootstrap?.resumePolicy, "explicit-after-registry-verification", "HTMDoc bootstrap resume policy drifted.");
  assert.ok(packages.every((candidate) => candidate.status === "publish-approved"), "Every HTMDoc package must be publish-approved.");

  // <lang><zh-CN>registry 状态按精确 name@version 分类；网络或协议错误不能被误判为“尚未发布”。</zh-CN><en>Registry state is classified by exact name@version; network or protocol errors can never be mistaken for “unpublished.”</en></lang>
  const states = await Promise.all(packages.map((candidate) => readRegistryState(inventory.registry, candidate)));
  const invalidStates = states.filter((state) => state.status === "error");
  assert.equal(invalidStates.length, 0, invalidStates.map((state) => `${state.name}: ${state.reason}`).join("\n"));

  const published = states.filter((state) => state.status === "published");
  const pending = states.filter((state) => state.status === "unpublished");
  if (published.length > 0 && !resume) {
    throw new Error(`Refusing a partial or repeated bootstrap without --resume: ${published.map((state) => state.name).join(", ")}`);
  }

  if (!execute) {
    process.stdout.write(`HTMDoc bootstrap preflight passed: ${pending.length} unpublished, ${published.length} published; resume=${resume}.\n`);
    return;
  }

  assert.equal(process.env.GITHUB_ACTIONS, "true", "Registry writes are restricted to GitHub Actions.");
  assert.equal(process.env.RUNNER_ENVIRONMENT, "github-hosted", "Registry writes require a GitHub-hosted runner for provenance.");
  assert.equal(process.env.GITHUB_REPOSITORY, "mandolin/hia-htmdoc", "Registry writes are bound to mandolin/hia-htmdoc.");
  assert.equal(process.env.GITHUB_REF_NAME, "main", "Registry writes are restricted to the main branch.");
  assert.ok(process.env.NODE_AUTH_TOKEN, "NODE_AUTH_TOKEN is required only for --publish.");

  if (pending.length === 0) {
    process.stdout.write("HTMDoc bootstrap resume found every approved version public; no npm publish call was made.\n");
    return;
  }

  // <lang><zh-CN>tarball 根目录由系统 API 创建；每包发布后等待精确版本可见，再进入下一个依赖层。</zh-CN><en>The tarball root is created by the system API; after each package publication, the exact version must become visible before the next dependency layer begins.</en></lang>
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hia-htmdoc-bootstrap-"));
  try {
    for (const state of pending) {
      const tarball = packCandidate(root, state.candidate, temporaryRoot);
      runNpm([
        "publish",
        tarball,
        "--access",
        "public",
        "--provenance",
        `--registry=${inventory.registry}`
      ], root, `publish ${state.name}@${state.version}`);
      await waitForPublishedVersion(inventory.registry, state.candidate);
    }
  } finally {
    assertTemporaryBoundary(temporaryRoot);
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }

  process.stdout.write(`HTMDoc bootstrap publish passed: ${pending.length} package(s) submitted with provenance.\n`);
}

/**
 * Read anonymous npm registry state for one exact candidate.
 *
 * @lang zh-CN 404 是唯一的未发布信号；其它非 2xx、JSON 错误或身份漂移均返回 error。
 * @lang en A 404 is the sole unpublished signal; every other non-2xx response, JSON failure, or identity drift returns error.
 * @param {string} registry npm registry 根 URL。 / npm registry base URL.
 * @param {object} candidate 已绑定 manifest 的候选。 / Candidate bound to its manifest.
 * @returns {Promise<{candidate: object, name: string, reason?: string, status: "error"|"published"|"unpublished", version: string}>} 精确版本状态。 / Exact-version state.
 */
async function readRegistryState(registry, candidate) {
  const name = candidate.name;
  const version = candidate.version;
  try {
    const url = new URL(`${encodeURIComponent(name)}/${encodeURIComponent(version)}`, registry);
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (response.status === 404) {
      return { candidate, name, status: "unpublished", version };
    }
    if (!response.ok) {
      return { candidate, name, reason: `HTTP ${response.status}`, status: "error", version };
    }
    const metadata = await response.json();
    if (metadata.name !== name || metadata.version !== version) {
      return { candidate, name, reason: "registry identity mismatch", status: "error", version };
    }
    return { candidate, name, status: "published", version };
  } catch (error) {
    return { candidate, name, reason: String(error.message ?? error), status: "error", version };
  }
}

/**
 * Pack one approved package through the active npm CLI.
 *
 * @lang zh-CN 使用真实 package directory 生成唯一 tarball；内部依赖已由 release gate 锁为精确 semver。
 * @lang en Produces exactly one tarball from the real package directory; the release gate already pins internal dependencies to exact SemVer.
 * @param {string} root 仓库根。 / Repository root.
 * @param {object} candidate 发布候选。 / Publication candidate.
 * @param {string} temporaryRoot 本次专用系统临时目录。 / Dedicated system temporary directory.
 * @returns {string} tarball 绝对路径。 / Absolute tarball path.
 */
function packCandidate(root, candidate, temporaryRoot) {
  const destination = path.join(temporaryRoot, candidate.name.replaceAll("@", "").replaceAll("/", "-"));
  fs.mkdirSync(destination, { recursive: true });
  const report = runNpm([
    "pack",
    path.join(root, candidate.directory),
    "--pack-destination",
    destination,
    "--json"
  ], root, `pack ${candidate.name}`);
  const packReports = JSON.parse(report.stdout);
  assert.equal(packReports.length, 1, `${candidate.name}: expected one tarball.`);
  const tarball = path.join(destination, packReports[0].filename);
  assert.ok(fs.statSync(tarball).isFile(), `${candidate.name}: npm pack did not create the reported tarball.`);
  return tarball;
}

/**
 * Wait for one newly published version to become anonymously visible.
 *
 * @lang zh-CN 最多等待九十秒处理 registry 传播；error 立即失败，避免隐藏服务异常。
 * @lang en Allows up to ninety seconds for registry propagation; error fails immediately so service faults remain visible.
 * @param {string} registry npm registry 根 URL。 / npm registry base URL.
 * @param {object} candidate 已发布候选。 / Published candidate.
 * @returns {Promise<void>} 可见性确认信号。 / Visibility confirmation signal.
 */
async function waitForPublishedVersion(registry, candidate) {
  for (let attempt = 1; attempt <= 18; attempt += 1) {
    const state = await readRegistryState(registry, candidate);
    if (state.status === "published") {
      return;
    }
    assert.equal(state.status, "unpublished", `${candidate.name}: registry verification failed: ${state.reason}`);
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`${candidate.name}@${candidate.version} did not become visible within ninety seconds.`);
}

/**
 * Run npm without printing environment values.
 *
 * @lang zh-CN npm script 内复用 npm_execpath；失败输出最多保留 npm 自身诊断，不拼接令牌或环境。
 * @lang en Reuses npm_execpath inside npm scripts; failures retain npm diagnostics only and never interpolate tokens or environment values.
 * @param {string[]} npmArgs npm 参数。 / npm arguments.
 * @param {string} cwd 工作目录。 / Working directory.
 * @param {string} label 稳定步骤名。 / Stable step label.
 * @returns {import("node:child_process").SpawnSyncReturns<string>} 子进程结果。 / Subprocess result.
 */
function runNpm(npmArgs, cwd, label) {
  const npmCli = process.env.npm_execpath;
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, ...npmArgs], { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })
    : spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", npmArgs, { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${label} failed:\n${result.stderr || result.stdout || "no process output"}`);
  return result;
}

/**
 * Prove recursive cleanup remains inside this run's OS temporary child.
 *
 * @lang zh-CN 删除目标必须是系统临时根的直接子目录，并带有本脚本专用前缀。
 * @lang en The deletion target must be a direct child of the OS temp root and carry this script's dedicated prefix.
 * @param {string} temporaryRoot 待清理目录。 / Cleanup target.
 * @returns {void}
 */
function assertTemporaryBoundary(temporaryRoot) {
  const systemTemp = path.resolve(os.tmpdir());
  const resolvedTarget = path.resolve(temporaryRoot);
  assert.notEqual(resolvedTarget, systemTemp, "Cleanup target must not be the OS temp root.");
  assert.equal(path.dirname(resolvedTarget), systemTemp, "Cleanup target must be a direct OS-temp child.");
  assert.ok(path.basename(resolvedTarget).startsWith("hia-htmdoc-bootstrap-"), "Cleanup target prefix drifted.");
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
