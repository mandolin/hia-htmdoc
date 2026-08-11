const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const { loadReleaseContext } = require("./release-packages.cjs");

/**
 * Configure or verify npm Trusted Publisher relationships for the HTMDoc train.
 *
 * @lang zh-CN 默认只运行 `npm trust list` 并验证八包均绑定 `mandolin/hia-htmdoc`、`npm-trusted-publish.yml` 和 publish-only 权限。`--apply` 才逐包创建关系；调用者必须使用 npm 11.15+ 的交互式账号身份，不能依赖首发 bypass-2FA 令牌。
 * @lang en By default, runs only `npm trust list` and verifies that all eight packages bind `mandolin/hia-htmdoc`, `npm-trusted-publish.yml`, and publish-only permission. `--apply` creates relationships package by package; callers must use an interactive npm 11.15+ account identity rather than the bootstrap bypass-2FA token.
 * @returns {void} 配置/核验完成信号。 / Completion signal for configuration or verification.
 * @throws {AssertionError|Error} npm 版本、登录态或 trust relationship 漂移时失败。 / Fails when the npm version, authentication, or a trust relationship drifts.
 */
function main() {
  const { inventory, packages, root } = loadReleaseContext();
  const apply = process.argv.includes("--apply");
  const npmVersion = runNpm(["--version"], root, "read npm version").stdout.trim();
  assertMinimumVersion(npmVersion, inventory.trustedPublisher.npmMinimum);

  for (const candidate of packages) {
    if (apply) {
      // <lang><zh-CN>allowed action 只授予普通 publish；W-P110 不把 staged publishing 混入首发信任接管。</zh-CN><en>The allowed action grants ordinary publish only; W-P110 does not mix staged publishing into first-release trust takeover.</en></lang>
      runNpm([
        "trust",
        "github",
        candidate.name,
        `--file=${inventory.trustedPublisher.workflow}`,
        `--repository=${inventory.trustedPublisher.repository}`,
        "--allow-publish",
        "--yes",
        `--registry=${inventory.registry}`
      ], root, `configure Trusted Publisher for ${candidate.name}`);
    }

    // <lang><zh-CN>npm 当前每包仅允许一个 trust relationship，因此 canonical JSON 中必须同时出现 provider、repo、workflow 与 publish permission，且不得出现 stage permission。</zh-CN><en>npm currently allows one trust relationship per package, so its canonical JSON must jointly contain provider, repository, workflow, and publish permission while excluding stage permission.</en></lang>
    const listResult = runNpm([
      "trust",
      "list",
      candidate.name,
      "--json",
      `--registry=${inventory.registry}`
    ], root, `verify Trusted Publisher for ${candidate.name}`);
    const canonical = JSON.stringify(JSON.parse(listResult.stdout)).toLowerCase();
    for (const requiredValue of ["github", inventory.trustedPublisher.repository, inventory.trustedPublisher.workflow, "publish"]) {
      assert.ok(canonical.includes(requiredValue.toLowerCase()), `${candidate.name}: Trusted Publisher is missing ${requiredValue}.`);
    }
    assert.ok(!canonical.includes("stage-publish") && !canonical.includes("stage_publish"), `${candidate.name}: staged publish permission is outside W-P110.`);
  }

  process.stdout.write(`HTMDoc Trusted Publisher ${apply ? "configuration" : "verification"} passed: ${packages.length} package(s), action=publish.\n`);
}

/**
 * Compare npm CLI major/minor/patch without adding a SemVer dependency.
 *
 * @lang zh-CN W-P110 只需固定的三段数字下限；预发布或非数字版本会 fail closed。
 * @lang en W-P110 needs only a fixed three-part numeric floor; prerelease or nonnumeric versions fail closed.
 * @param {string} actual 当前 npm 版本。 / Current npm version.
 * @param {string} minimum 清单要求的最低版本。 / Minimum inventory version.
 * @returns {void}
 */
function assertMinimumVersion(actual, minimum) {
  const parse = (value) => {
    assert.match(value, /^\d+\.\d+\.\d+$/, `Unsupported npm version: ${value}`);
    return value.split(".").map(Number);
  };
  const actualParts = parse(actual);
  const minimumParts = parse(minimum);
  const comparison = actualParts[0] - minimumParts[0]
    || actualParts[1] - minimumParts[1]
    || actualParts[2] - minimumParts[2];
  assert.ok(comparison >= 0, `npm ${actual} does not satisfy the Trusted Publishing minimum ${minimum}.`);
}

/**
 * Run npm while preserving the active mise/npm process lineage.
 *
 * @lang zh-CN 失败信息只回显 npm stdout/stderr，不读取或打印认证配置。
 * @lang en Failure output contains npm stdout/stderr only and never reads or prints authentication configuration.
 * @param {string[]} npmArgs npm 参数。 / npm arguments.
 * @param {string} cwd 工作目录。 / Working directory.
 * @param {string} label 稳定步骤名。 / Stable step label.
 * @returns {import("node:child_process").SpawnSyncReturns<string>} 子进程结果。 / Subprocess result.
 */
function runNpm(npmArgs, cwd, label) {
  const npmCli = process.env.npm_execpath;
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, ...npmArgs], { cwd, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 })
    : spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", npmArgs, { cwd, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${label} failed:\n${result.stderr || result.stdout || "no process output"}`);
  return result;
}

main();
