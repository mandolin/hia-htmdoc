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
  // <lang><zh-CN>同一范围同时约束公开包、锁文件、工作流与本地运行时，不从旧已发布归档推断当前源码元数据。</zh-CN><en>One range binds public packages, the lockfile, workflows, and local runtime; historical published tarballs do not define current source metadata.</en></lang>
  const expectedNodeRange = "^22.23.4 || ^24.22.1";
  const rootPackage = readJson(path.join(root, "package.json"));
  const lock = readJson(path.join(root, "package-lock.json"));

  assert.equal(rootPackage.private, true, "The workspace root must remain private.");
  assert.equal(rootPackage.version, inventory.candidateVersion, "Workspace and candidate versions must stay aligned.");
  assert.equal(rootPackage.engines?.node, expectedNodeRange, "Workspace Node support range drifted.");
  assert.equal(lock.packages?.[""]?.engines?.node, expectedNodeRange, "Locked workspace Node range drifted.");
  // <lang><zh-CN>发布候选门禁还须在实际 Node.js 进程上执行，避免 npm 默认仅警告 engines 时误记绿色。</zh-CN><en>The release gate must also run on an allowed Node.js process because npm otherwise treats engines as advisory.</en></lang>
  const [runtimeMajor, runtimeMinor, runtimePatch] = process.versions.node.split(".").map(Number);
  assert.ok(
    (runtimeMajor === 22 && (runtimeMinor > 23 || (runtimeMinor === 23 && runtimePatch >= 4))) ||
    (runtimeMajor === 24 && (runtimeMinor > 22 || (runtimeMinor === 22 && runtimePatch >= 1))),
    `Unsupported release-gate Node.js runtime: ${process.version}.`
  );
  assert.match(fs.readFileSync(path.join(root, ".mise.toml"), "utf8"), /^node = "24\.22\.1"\s*$/m, "mise runtime drifted.");
  const ciWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "ci.yml"), "utf8");
  assert.match(ciWorkflow, /node:\s*\n\s*- 22\.23\.4\s*\n\s*- 24\.22\.1\s*\n\s*steps:/, "CI Node.js matrix drifted.");
  assert.doesNotMatch(ciWorkflow, /20\.20\.2/, "CI must not run unsupported Node.js 20.");
  assert.deepEqual(packages.map((item) => item.name), expectedNames, "Public package order or identity drifted.");
  assert.ok(["local-release-candidate", "publish-approved", "published"].includes(inventory.releaseStatus), "Release train status is unsupported.");
  assert.equal(inventory.trustedPublisher?.nodeMinimum, "22.14.0", "Trusted Publishing Node minimum drifted from npm requirements.");
  assert.equal(inventory.trustedPublisher?.npmMinimum, "11.15.0", "npm trust management baseline drifted from npm requirements.");
  assert.equal(inventory.trustedPublisher?.allowedAction, "publish", "Trusted Publisher must allow npm publish only.");
  assert.equal(inventory.provenanceRequired, true, "Future public publication must require provenance.");
  if (inventory.releaseStatus === "local-release-candidate") {
    // <lang><zh-CN>新版是既有八包的候选升级，保留真实首发历史而不再次制造首次发布未定案；publish-ready 仍要求单独批准。</zh-CN><en>This is a candidate upgrade of eight existing packages: retain genuine first-publication history without inventing an unresolved first publish; publish-ready still requires separate approval.</en></lang>
    const historical = readJson(path.join(root, "release/history/public-packages-0.1.0.json"));
    assert.equal(historical.releaseStatus, "published", "Original publication history must remain published.");
    assert.equal(historical.candidateVersion, "0.1.0", "Historical package identity drifted.");
    assert.equal(inventory.trustedPublisher?.firstPublishBootstrap, historical.trustedPublisher.firstPublishBootstrap, "Resolved publisher history drifted.");
  } else {
    assert.notEqual(inventory.trustedPublisher?.firstPublishBootstrap, "decision-required-before-first-publish", "A publish-approved train must resolve first-publish bootstrap.");
  }
  assert.equal(inventory.bootstrap?.workflow, "npm-bootstrap-publish.yml", "Bootstrap workflow identity drifted.");
  assert.equal(inventory.bootstrap?.secret, "HIA_NPM_BOOTSTRAP_TOKEN", "Bootstrap secret identity drifted.");
  assert.equal(inventory.bootstrap?.credential, "temporary-granular-access-token", "Bootstrap credential class drifted.");
  assert.equal(inventory.bootstrap?.resumePolicy, "explicit-after-registry-verification", "Bootstrap resume policy drifted.");
  const expectedPackageStatus = inventory.releaseStatus === "published" ? "published" : inventory.releaseStatus;
  assert.ok(packages.every((candidate) => candidate.status === expectedPackageStatus), "Package statuses must align with the release train.");

  // <lang><zh-CN>依赖顺序表用于证明任一内部依赖都位于消费者之前。</zh-CN><en>The dependency-order table proves that every internal dependency precedes its consumer.</en></lang>
  const packageOrder = new Map(packages.map((item) => [item.name, item.order]));
  for (const candidate of packages) {
    const manifest = candidate.packageJson;
    assert.equal(candidate.version, inventory.candidateVersion, `${candidate.name} version drifted.`);
    assert.equal(manifest.private, undefined, `${candidate.name} must remain publishable.`);
    assert.equal(manifest.license, "MIT", `${candidate.name} must retain the MIT license.`);
    assert.equal(manifest.repository?.url, expectedRepositoryUrl, `${candidate.name} repository URL drifted.`);
    assert.equal(manifest.repository?.directory, candidate.directory, `${candidate.name} repository directory drifted.`);
    assert.equal(manifest.bugs?.url, "https://github.com/mandolin/hia-htmdoc/issues", `${candidate.name} bugs URL drifted.`);
    assert.match(manifest.homepage ?? "", /^https:\/\/github\.com\/mandolin\/hia-htmdoc\/tree\/main\/packages\//, `${candidate.name} homepage must point to its public package directory.`);
    assert.equal(manifest.engines?.node, expectedNodeRange, `${candidate.name} Node support range drifted.`);
    assert.equal(lock.packages?.[candidate.directory]?.engines?.node, expectedNodeRange, `${candidate.name} locked Node support range drifted.`);
    assert.equal(manifest.publishConfig?.access, "public", `${candidate.name} must opt into public scoped publication.`);
    assert.deepEqual(manifest.files, ["src", "README.md", "API.md", "MIGRATION.md", "LICENSE"], `${candidate.name} pack allow-list drifted.`);
    assert.ok(Array.isArray(manifest.keywords) && manifest.keywords.includes("documentation"), `${candidate.name} must expose public discovery metadata.`);

    // <lang><zh-CN>子包必须自带公开说明和许可证，不能借用私有 workspace 根文件。</zh-CN><en>Each child package must carry public documentation and a license instead of borrowing private workspace-root files.</en></lang>
    for (const requiredFile of ["README.md", "API.md", "MIGRATION.md", "LICENSE", "src/index.mjs"]) {
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
  assert.match(workflow, /node-version:\s*24\.22\.1/, "Trusted Publish Node.js baseline drifted.");
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

  // <lang><zh-CN>首发 workflow 与脚本共同锁住精确提交、GitHub-hosted provenance、专用 secret 和显式 partial resume。</zh-CN><en>The bootstrap workflow and script jointly lock the exact commit, GitHub-hosted provenance, dedicated secret, and explicit partial resume.</en></lang>
  const bootstrapWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", inventory.bootstrap.workflow), "utf8");
  assert.match(bootstrapWorkflow, /node-version:\s*24\.22\.1/, "Bootstrap Publish Node.js baseline drifted.");
  for (const requiredText of [
    "runs-on: ubuntu-latest",
    "id-token: write",
    "expected_head_sha",
    "HIA_NPM_BOOTSTRAP_TOKEN",
    "npm@11.18.0",
    "--publish",
    "resume_partial_batch",
    "release:registry:check"
  ]) {
    assert.ok(bootstrapWorkflow.includes(requiredText), `Bootstrap workflow is missing: ${requiredText}`);
  }
  const bootstrapScript = fs.readFileSync(path.join(root, "scripts", "bootstrap-public-release.cjs"), "utf8");
  for (const requiredText of ["--provenance", "--resume", "RUNNER_ENVIRONMENT", "github-hosted", "explicit-after-registry-verification"]) {
    assert.ok(bootstrapScript.includes(requiredText), `Bootstrap script is missing: ${requiredText}`);
  }
  const registryCheck = fs.readFileSync(path.join(root, "scripts", "check-registry-release.cjs"), "utf8");
  for (const requiredText of ["sha512-", "https://slsa.dev/provenance/v1", "htmdoc-public-registry-consumer", "sourcesContentPolicy"]) {
    assert.ok(registryCheck.includes(requiredText), `Registry release check is missing: ${requiredText}`);
  }
  const trustManager = fs.readFileSync(path.join(root, "scripts", "manage-trusted-publishers.cjs"), "utf8");
  for (const requiredText of ["npmMinimum", "--allow-publish", "trust", "list", "inventory.trustedPublisher.workflow"]) {
    assert.ok(trustManager.includes(requiredText), `Trusted Publisher manager is missing: ${requiredText}`);
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
