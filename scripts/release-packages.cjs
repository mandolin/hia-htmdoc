const fs = require("node:fs");
const path = require("node:path");

/**
 * HTMDoc public package inventory loader.
 *
 * @lang zh-CN 加载唯一的公开包清单，并将清单身份与真实 package.json 绑定；调用方不得自行复制包顺序。
 * @lang en Loads the sole public-package inventory and binds inventory identities to real package.json files; callers must not duplicate package order.
 * @returns {{ inventory: object, packages: Array<{ directory: string, name: string, order: number, status: string, version: string, packageJson: object }>, root: string }} 已按依赖顺序排列的发布上下文。 / Release context ordered by dependencies.
 * @throws {Error} 清单重复、路径越界、身份漂移或 package.json 缺失时抛出。 / Thrown for duplicates, path escape, identity drift, or missing package.json.
 */
function loadReleaseContext() {
  // <lang><zh-CN>仓库根是清单路径和所有候选目录的共同信任边界。</zh-CN><en>The repository root is the shared trust boundary for the inventory path and every candidate directory.</en></lang>
  const root = path.resolve(__dirname, "..");
  // <lang><zh-CN>JSON 清单是 workflow、resolver 和本地门禁共享的单一事实源。</zh-CN><en>The JSON inventory is the single source of truth shared by the workflow, resolver, and local gates.</en></lang>
  const inventoryPath = path.join(root, "release", "public-packages.json");
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const seenNames = new Set();
  const seenDirectories = new Set();

  if (!Array.isArray(inventory.packages) || inventory.packages.length === 0) {
    throw new Error("release/public-packages.json must declare at least one package.");
  }

  // <lang><zh-CN>先按显式顺序排序，再绑定真实 manifest，使所有发布消费者得到一致的依赖优先序。</zh-CN><en>Sort by explicit order before binding real manifests so every release consumer receives the same dependency-first sequence.</en></lang>
  const packages = [...inventory.packages]
    .sort((left, right) => left.order - right.order)
    .map((entry) => {
      if (seenNames.has(entry.name) || seenDirectories.has(entry.directory)) {
        throw new Error(`Duplicate release package identity: ${entry.name} (${entry.directory}).`);
      }
      seenNames.add(entry.name);
      seenDirectories.add(entry.directory);

      const packageRoot = path.resolve(root, entry.directory);
      const relativePackageRoot = path.relative(root, packageRoot);
      if (relativePackageRoot.startsWith("..") || path.isAbsolute(relativePackageRoot)) {
        throw new Error(`Release package escapes repository root: ${entry.directory}.`);
      }

      const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
      if (packageJson.name !== entry.name) {
        throw new Error(`Release package identity drift: expected ${entry.name}, received ${packageJson.name}.`);
      }

      return {
        ...entry,
        packageJson,
        version: packageJson.version
      };
    });

  return { inventory, packages, root };
}

module.exports = { loadReleaseContext };
