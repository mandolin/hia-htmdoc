/**
 * @file Keep all eight packages' public responsibilities in their actual archives.
 * @lang zh-CN 对照真实根导出、JSON 资源与 bin 核包内文档覆盖，不把关键词检查冒充语义审阅。
 * @lang en Checks packaged docs against actual root exports, JSON resources and binaries without treating keyword checks as semantic review.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

// <lang><zh-CN>固定本仓根与唯一发行清单，不扫描业务仓或安装模块。</zh-CN><en>Fix this repository root and sole inventory without scanning business repositories or installed modules.</en></lang>
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventory = JSON.parse(fs.readFileSync(path.join(root, "release/public-packages.json"), "utf8"));
let slots = 0;
let resources = 0;
let bins = 0;
for (const item of inventory.packages) {
  // <lang><zh-CN>只导入清单内显式 src 根；这些纯模块导入不执行构建或读取用户配置。</zh-CN><en>Import only explicit source roots from the inventory; these pure imports never build or read user config.</en></lang>
  const directory = path.join(root, item.directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  const api = fs.readFileSync(path.join(directory, "API.md"), "utf8");
  const module = await import(pathToFileURL(path.join(directory, manifest.exports["."])).href);
  for (const section of ["Public exports", "Inputs", "Returns", "Defaults", "Errors", "Effects", "Compatibility", "Source linkage", "Privacy"]) {
    assert.ok(api.includes(`## ${section}`), `${item.name}: missing responsibility section ${section}`);
  }
  for (const name of Object.keys(module)) {
    assert.ok(api.includes(`\`${name}\``) || api.includes(`\`${name}(`), `${item.name}: undocumented export ${name}`);
    slots++;
  }
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    if (subpath === ".") continue;
    assert.equal(typeof target, "string");
    assert.ok(api.includes(subpath), `${item.name}: undocumented subpath ${subpath}`);
    assert.ok(fs.statSync(path.join(directory, target)).isFile());
    resources++;
  }
  for (const bin of Object.keys(manifest.bin ?? {})) {
    assert.ok(api.includes(`\`${bin}\``), `${item.name}: undocumented bin ${bin}`);
    bins++;
  }
  for (const file of ["API.md", "MIGRATION.md", "README.md", "LICENSE"]) {
    assert.ok(manifest.files.includes(file), `${item.name}: ${file} is outside the archive allow-list`);
    assert.ok(fs.readFileSync(path.join(directory, file), "utf8").trim());
  }
}
assert.equal(inventory.packages.length, 8);
assert.equal(slots, 57);
assert.equal(resources, 4);
assert.equal(bins, 2);
console.log(`HTMDoc public responsibility check passed: 8 packages, ${slots} exports, ${resources} resources, ${bins} bins.`);
