import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Read a release-control file from this satellite repository.
 *
 * @lang zh-CN 将运行时声明测试绑定到本仓路径，避免从工作区容器或其他卫星误读同名文件。
 * @lang en Binds runtime-declaration tests to this repository so they cannot read identically named files from the workspace container or another satellite.
 * @param {string} relativePath 相对于仓库根的路径。 / Path relative to the repository root.
 * @returns {Promise<string>} UTF-8 文件内容。 / UTF-8 file contents.
 */
async function readRepositoryFile(relativePath) {
  // <lang><zh-CN>测试文件在仓库根下的 test 目录，父目录即根。</zh-CN><en>The test file lives in the repository's test directory, whose parent is the root.</en></lang>
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

/**
 * Keep the source candidate's declared runtime range aligned across all release surfaces.
 *
 * @lang zh-CN 仅核当前源码候选的运行时声明，不修改已发布 0.1.0 归档或推断 npm 注册表元数据已经更新。
 * @lang en Checks runtime declarations of the current source candidate only; it neither changes published 0.1.0 tarballs nor assumes registry metadata has changed.
 */
test("HTMDoc source candidate declares one Node.js 22/24 runtime range", async () => {
  const supportedNodeRange = "^22.23.4 || ^24.22.1";
  const packageNames = [
    "cem-adapter",
    "html-doc-adapter",
    "html-doc-extractor",
    "html-doc-source-map",
    "html-parser",
    "htmdoc-producer",
    "htmdoc-runner",
    "htmdoc-spec"
  ];
  // <lang><zh-CN>根与八个公开包的清单及锁文件都需要一致，防止打包后的 engines 与开发门禁分叉。</zh-CN><en>Root and eight public manifests and lock entries must agree so packed engines cannot diverge from development gates.</en></lang>
  const rootPackage = JSON.parse(await readRepositoryFile("package.json"));
  const lock = JSON.parse(await readRepositoryFile("package-lock.json"));
  assert.equal(rootPackage.engines?.node, supportedNodeRange);
  assert.equal(lock.packages[""]?.engines?.node, supportedNodeRange);
  for (const name of packageNames) {
    const packageDirectory = `packages/${name}`;
    const manifest = JSON.parse(await readRepositoryFile(`${packageDirectory}/package.json`));
    assert.equal(manifest.version, "1.0.0", `${name} source candidate identity changed`);
    assert.equal(manifest.engines?.node, supportedNodeRange, `${name} source engine drifted`);
    assert.equal(lock.packages[packageDirectory]?.engines?.node, supportedNodeRange, `${name} lock engine drifted`);
  }
  assert.match(await readRepositoryFile(".mise.toml"), /^node = "24\.22\.1"\s*$/m);
});

/**
 * Require continuous integration and publication jobs to select supported runtimes.
 *
 * @lang zh-CN 防止 CI 保留旧 Node.js 20 或发布工作流落到低于候选 engines 下界的 Node.js 24 缓存版本。
 * @lang en Prevents CI from retaining Node.js 20 and publication jobs from selecting a cached Node.js 24 version below the candidate engine floor.
 */
test("HTMDoc CI and publication use supported Node.js runtimes", async () => {
  const ci = await readRepositoryFile(".github/workflows/ci.yml");
  const trustedPublish = await readRepositoryFile(".github/workflows/npm-trusted-publish.yml");
  const bootstrapPublish = await readRepositoryFile(".github/workflows/npm-bootstrap-publish.yml");
  assert.match(ci, /node:\s*\n\s*- 22\.23\.4\s*\n\s*- 24\.22\.1\s*\n\s*steps:/);
  assert.doesNotMatch(ci, /20\.20\.2/);
  assert.match(trustedPublish, /node-version:\s*24\.22\.1/);
  assert.match(bootstrapPublish, /node-version:\s*24\.22\.1/);
});
