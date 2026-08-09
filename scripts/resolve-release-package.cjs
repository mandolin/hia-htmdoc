const assert = require("node:assert/strict");
const fs = require("node:fs");

const { loadReleaseContext } = require("./release-packages.cjs");

/**
 * Resolve one bounded HTMDoc package candidate.
 *
 * @lang zh-CN 普通模式供本地审计读取候选；`--publish-ready` 模式额外要求独立批准发布状态和首次发布 bootstrap 决策。
 * @lang en Normal mode exposes a candidate for local audit; `--publish-ready` additionally requires independently approved publication state and a resolved first-publish bootstrap decision.
 * @returns {void} JSON 输出到 stdout 或 GitHub Actions output。 / Writes JSON to stdout or GitHub Actions output.
 * @throws {AssertionError} 包未知、版本漂移、公开元数据不合格或尚未获准发布时抛出。 / Thrown for unknown packages, version drift, invalid public metadata, or missing publish approval.
 */
function main() {
  // <lang><zh-CN>位置参数只承载一个明确包名；其余参数是无副作用的输出/严格模式开关。</zh-CN><en>The positional argument carries one explicit package name; remaining arguments are side-effect-free output and strictness switches.</en></lang>
  const packageName = process.argv[2];
  const writeGithubOutput = process.argv.includes("--github-output");
  const requirePublishReady = process.argv.includes("--publish-ready");
  const { inventory, packages } = loadReleaseContext();

  assert.ok(packageName && !packageName.startsWith("--"), "Usage: node scripts/resolve-release-package.cjs <package-name> [--publish-ready] [--github-output]");
  const candidate = packages.find((item) => item.name === packageName);
  assert.ok(candidate, `Unknown HTMDoc release package: ${packageName}`);
  assert.equal(candidate.version, inventory.candidateVersion, `${candidate.name} must use candidate version ${inventory.candidateVersion}.`);
  assert.equal(candidate.packageJson.private, undefined, `${candidate.name} must not be private.`);
  assert.equal(candidate.packageJson.publishConfig?.access, inventory.access, `${candidate.name} must publish with ${inventory.access} access.`);

  if (requirePublishReady) {
    // <lang><zh-CN>双层状态阻止仅修改一处清单字段就意外放行。</zh-CN><en>Two-layer status prevents an accidental release after changing only one inventory field.</en></lang>
    assert.equal(inventory.releaseStatus, "publish-approved", "HTMDoc release train is not publish-approved.");
    assert.equal(candidate.status, "publish-approved", `${candidate.name} is not publish-approved.`);
    assert.notEqual(
      inventory.trustedPublisher?.firstPublishBootstrap,
      "decision-required-before-first-publish",
      "First-publish bootstrap remains an explicit pre-publication decision."
    );
  }

  const output = {
    package_dir: candidate.directory,
    package_name: candidate.name,
    package_version: candidate.version,
    release_status: candidate.status
  };

  if (writeGithubOutput) {
    const githubOutput = process.env.GITHUB_OUTPUT;
    assert.ok(githubOutput, "--github-output requires GITHUB_OUTPUT.");
    fs.appendFileSync(
      githubOutput,
      `${Object.entries(output).map(([key, value]) => `${key}=${value}`).join("\n")}\n`,
      "utf8"
    );
    return;
  }

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main();
