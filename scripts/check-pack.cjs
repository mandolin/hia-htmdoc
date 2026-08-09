const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const { loadReleaseContext } = require("./release-packages.cjs");

/**
 * Inspect each public candidate using npm's own pack calculation.
 *
 * @lang zh-CN 对清单中的八个包运行 `npm pack --dry-run --json`，校验允许文件和拒绝文件，不创建 tarball。
 * @lang en Runs `npm pack --dry-run --json` for all eight inventoried packages, validates allowed and rejected files, and creates no tarball.
 * @returns {void} 所有 tarball 预览安全时输出稳定计数。 / Writes a stable count when every tarball preview is safe.
 */
function main() {
  const { inventory, packages, root } = loadReleaseContext();
  let packedFileCount = 0;

  for (const candidate of packages) {
    // <lang><zh-CN>通过当前 mise/npm 进程提供的 CLI 执行，避免脚本暗中切换系统 Node。</zh-CN><en>Execute through the CLI supplied by the current mise/npm process so the script cannot silently switch to system Node.</en></lang>
    const result = runNpm(["pack", "--dry-run", "--json"], path.join(root, candidate.directory));
    assert.equal(result.status, 0, result.stderr || result.stdout || `npm pack failed for ${candidate.name}.`);
    const [pack] = JSON.parse(result.stdout);
    const packedPaths = new Set((pack.files ?? []).map((file) => file.path.replaceAll("\\", "/")));
    packedFileCount += packedPaths.size;

    assert.equal(pack.name, candidate.name, `${candidate.name} pack identity drifted.`);
    assert.equal(pack.version, inventory.candidateVersion, `${candidate.name} pack version drifted.`);
    for (const requiredPath of ["LICENSE", "README.md", "package.json", "src/index.mjs"]) {
      assert.ok(packedPaths.has(requiredPath), `${candidate.name} pack is missing ${requiredPath}.`);
    }
    for (const filePath of packedPaths) {
      assert.ok(!filePath.includes("node_modules/"), `${candidate.name} pack contains node_modules: ${filePath}.`);
      assert.ok(!filePath.endsWith(".tgz"), `${candidate.name} pack contains a nested tarball: ${filePath}.`);
      assert.ok(!filePath.startsWith("test/") && !filePath.startsWith("fixtures/"), `${candidate.name} pack contains internal validation material: ${filePath}.`);
    }

    if (candidate.name === "@hia-doc/htmdoc-runner") {
      // <lang><zh-CN>两个 CLI 和纯 handoff evaluator 属于 runner 的公开表面，必须随入口一起打包。</zh-CN><en>Both CLIs and the pure handoff evaluator are runner public surface and must be packed with the entry point.</en></lang>
      for (const runnerPath of ["src/cli.mjs", "src/html-authoring-handoff.mjs", "src/html-authoring-handoff-cli.mjs"]) {
        assert.ok(packedPaths.has(runnerPath), `@hia-doc/htmdoc-runner pack is missing ${runnerPath}.`);
      }
    }
  }

  process.stdout.write(`HTMDoc pack check passed: ${packages.length} package(s), ${packedFileCount} packed file(s).\n`);
}

/**
 * Run npm with the same Node/npm toolchain that started the release gate.
 *
 * @lang zh-CN npm script 环境优先复用 `npm_execpath`；直接执行脚本时才退回当前 PATH 中的 npm。
 * @lang en Reuses `npm_execpath` in npm-script environments and falls back to npm on the current PATH only for direct execution.
 * @param {string[]} npmArgs npm 子命令参数。 / npm subcommand arguments.
 * @param {string} cwd 工作目录。 / Working directory.
 * @returns {import("node:child_process").SpawnSyncReturns<string>} 同步进程结果。 / Synchronous process result.
 */
function runNpm(npmArgs, cwd) {
  const npmCli = process.env.npm_execpath;
  if (npmCli) {
    return spawnSync(process.execPath, [npmCli, ...npmArgs], { cwd, encoding: "utf8" });
  }
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(command, npmArgs, { cwd, encoding: "utf8" });
}

main();
