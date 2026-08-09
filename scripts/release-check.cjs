const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { loadReleaseContext } = require("./release-packages.cjs");

/**
 * Validate the HTMDoc public-package foundation without contacting a registry.
 *
 * @lang zh-CN 校验八包候选身份、公开元数据、依赖顺序、隐私边界和工作流防误发条件；本检查不执行发布或网络访问。
 * @lang en Validates eight candidate identities, public metadata, dependency order, privacy boundaries, and workflow refusal guards; this check neither publishes nor accesses a network.
 * @returns {void} 成功时输出稳定摘要。 / Writes a stable summary on success.
 * @throws {AssertionError|Error} 任一候选或发布控制面漂移时失败。 / Fails when any candidate or release control surface drifts.
 */
function main() {
  // <lang><zh-CN>发布上下文绑定清单与真实 manifest，避免后续检查读取两套包集合。</zh-CN><en>The release context binds inventory entries to real manifests so later checks cannot read two package sets.</en></lang>
  const { inventory, packages, root } = loadReleaseContext();
  const expectedNames = [
    "@hia-doc/htmdoc-spec",
    "@hia-doc/html-parser",
    "@hia-doc/html-doc-source-map",
    "@hia-doc/html-doc-extractor",
    "@hia-doc/html-doc-adapter",
    "@hia-doc/cem-adapter",
    "@hia-doc/htmdoc-runner",
    "@hia-doc/htmdoc-producer"
  ];
  const expectedRepositoryUrl = "git+https://github.com/mandolin/hia-htmdoc.git";
  const rootPackage = readJson(path.join(root, "package.json"));

  assert.equal(rootPackage.private, true, "The workspace root must remain private.");
  assert.equal(rootPackage.version, inventory.candidateVersion, "Workspace and candidate versions must stay aligned.");
  assert.deepEqual(packages.map((item) => item.name), expectedNames, "Public package order or identity drifted.");
  assert.ok(["local-release-candidate", "publish-approved"].includes(inventory.releaseStatus), "Release train status is unsupported.");
  assert.equal(inventory.trustedPublisher?.nodeMinimum, "22.14.0", "Trusted Publishing Node minimum drifted from npm requirements.");
  assert.equal(inventory.trustedPublisher?.npmMinimum, "11.15.0", "npm trust management baseline drifted from npm requirements.");
  assert.equal(inventory.provenanceRequired, true, "Future public publication must require provenance.");
  if (inventory.releaseStatus === "local-release-candidate") {
    assert.equal(inventory.trustedPublisher?.firstPublishBootstrap, "decision-required-before-first-publish", "First-publish bootstrap must remain unresolved before publication approval.");
  } else {
    assert.notEqual(inventory.trustedPublisher?.firstPublishBootstrap, "decision-required-before-first-publish", "A publish-approved train must resolve first-publish bootstrap.");
  }

  // <lang><zh-CN>依赖顺序表用于证明任一内部依赖都位于消费者之前。</zh-CN><en>The dependency-order table proves that every internal dependency precedes its consumer.</en></lang>
  const packageOrder = new Map(packages.map((item) => [item.name, item.order]));
  for (const candidate of packages) {
    const manifest = candidate.packageJson;
    assert.equal(candidate.version, inventory.candidateVersion, `${candidate.name} version drifted.`);
    assert.equal(manifest.private, undefined, `${candidate.name} must be publishable but not yet published.`);
    assert.equal(manifest.license, "MIT", `${candidate.name} must retain the MIT license.`);
    assert.equal(manifest.repository?.url, expectedRepositoryUrl, `${candidate.name} repository URL drifted.`);
    assert.equal(manifest.repository?.directory, candidate.directory, `${candidate.name} repository directory drifted.`);
    assert.equal(manifest.bugs?.url, "https://github.com/mandolin/hia-htmdoc/issues", `${candidate.name} bugs URL drifted.`);
    assert.match(manifest.homepage ?? "", /^https:\/\/github\.com\/mandolin\/hia-htmdoc\/tree\/main\/packages\//, `${candidate.name} homepage must point to its public package directory.`);
    assert.equal(manifest.engines?.node, ">=20.19.0", `${candidate.name} Node support floor drifted.`);
    assert.equal(manifest.publishConfig?.access, "public", `${candidate.name} must opt into public scoped publication.`);
    assert.deepEqual(manifest.files, ["src", "README.md", "LICENSE"], `${candidate.name} pack allow-list drifted.`);
    assert.ok(Array.isArray(manifest.keywords) && manifest.keywords.includes("documentation"), `${candidate.name} must expose public discovery metadata.`);

    // <lang><zh-CN>子包必须自带公开说明和许可证，不能借用私有 workspace 根文件。</zh-CN><en>Each child package must carry public documentation and a license instead of borrowing private workspace-root files.</en></lang>
    for (const requiredFile of ["README.md", "LICENSE", "src/index.mjs"]) {
      const requiredPath = path.join(root, candidate.directory, requiredFile);
      assert.ok(fs.readFileSync(requiredPath, "utf8").trim(), `${candidate.name} is missing non-empty ${requiredFile}.`);
    }

    for (const [dependencyName, dependencyVersion] of Object.entries(manifest.dependencies ?? {})) {
      if (!packageOrder.has(dependencyName)) {
        continue;
      }
      assert.equal(dependencyVersion, inventory.candidateVersion, `${candidate.name} must pin ${dependencyName} exactly.`);
      assert.ok(packageOrder.get(dependencyName) < candidate.order, `${dependencyName} must precede ${candidate.name} in publish order.`);
    }
  }

  // <lang><zh-CN>工作流文本检查锁住最小 OIDC 权限、不可变 action SHA、显式确认和 publish-ready resolver。</zh-CN><en>Workflow text checks lock the minimum OIDC permission, immutable action SHAs, explicit confirmation, and the publish-ready resolver.</en></lang>
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", inventory.trustedPublisher.workflow), "utf8");
  for (const requiredText of [
    "id-token: write",
    "contents: read",
    "publish @hia-doc htmdoc package",
    "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
    "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38",
    "--publish-ready",
    "--provenance"
  ]) {
    assert.ok(workflow.includes(requiredText), `Trusted Publish workflow is missing: ${requiredText}`);
  }

  const npmIgnore = fs.readFileSync(path.join(root, ".npmignore"), "utf8");
  for (const requiredPattern of ["node_modules/", "packages/*/node_modules/", "*.tgz"]) {
    assert.ok(npmIgnore.includes(requiredPattern), `Missing .npmignore safety pattern: ${requiredPattern}`);
  }

  process.stdout.write(`HTMDoc public release foundation check passed: ${packages.length} package(s) at ${inventory.candidateVersion}; status=${inventory.releaseStatus}.\n`);
}

/**
 * Read one UTF-8 JSON document.
 *
 * @lang zh-CN 统一 JSON 读取边界，让解析错误保留真实文件路径上下文。
 * @lang en Centralizes the JSON read boundary so parse errors retain real file-path context.
 * @param {string} filePath JSON 文件绝对路径。 / Absolute JSON file path.
 * @returns {object} 解析后的 JSON object。 / Parsed JSON object.
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

main();
