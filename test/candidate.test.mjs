/**
 * @file HTML package-candidate and public-boundary regressions.
 * @lang zh-CN 集中验收八包版本/文档、标签/定位器隐私与真实源码片段；不发布或写业务仓。
 * @lang en Jointly checks eight package versions/docs, tag/locator privacy and real source fragments without publishing or writing business repositories.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { getHtmlDocSymbolKind, isHtmlDocTag } from "../packages/htmdoc-spec/src/index.mjs";
import { parseHtml } from "../packages/html-parser/src/index.mjs";
import { extractHtmlDoc } from "../packages/html-doc-extractor/src/index.mjs";
import { cemManifestToHtmlExtraction } from "../packages/cem-adapter/src/index.mjs";
import { htmlExtractionToHiaDocument } from "../packages/html-doc-adapter/src/index.mjs";
import { createHtmlDocumentationSourceMap, normalizeSourcesContentPolicy } from "../packages/html-doc-source-map/src/index.mjs";
import { HTMDOC_RUNNER_VERSION } from "../packages/htmdoc-runner/src/index.mjs";

/** @lang zh-CN 唯一本仓绝对根，只用于测试文件读取。 @lang en Exact repository root used only for test-file reads. */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** @lang zh-CN 已确认八包集合，不能从候选清单自身反推范围。 @lang en Confirmed eight-package set, never inferred from the candidate inventory itself. */
const names = ["htmdoc-spec", "html-parser", "html-doc-source-map", "html-doc-extractor", "html-doc-adapter", "cem-adapter", "htmdoc-runner", "htmdoc-producer"];
/** @lang zh-CN 合成隐私哨兵，不是真实私有值。 @lang en Synthetic privacy sentinel, never an actual private value. */
const sentinel = "private-candidate-sentinel";
for (const name of names) {
  test(`${name} is an original public 1.0.0 source candidate`, async () => {
    const manifest = JSON.parse(await readFile(path.join(root, "packages", name, "package.json"), "utf8"));
    assert.equal(manifest.version, "1.0.0");
    assert.notEqual(manifest.private, true);
    assert.equal(manifest.publishConfig.access, "public");
    for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
      if (dependency.startsWith("@hia-doc/")) assert.equal(version, "1.0.0");
    }
    for (const file of ["API.md", "MIGRATION.md", "LICENSE", "README.md"]) {
      assert.ok(manifest.files.includes(file));
      assert.ok((await readFile(path.join(root, "packages", name, file), "utf8")).trim());
    }
  });
}
// <lang><zh-CN>标签匹配只使用自有声明，不继承 Object.prototype 上的名称。</zh-CN><en>Tag lookup uses own declarations only, never names inherited from Object.prototype.</en></lang>
for (const tag of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
  test(`tag registry refuses inherited ${tag}`, () => {
    assert.equal(getHtmlDocSymbolKind(tag), null);
    assert.equal(isHtmlDocTag(tag), false);
  });
}
// <lang><zh-CN>三个直接 API 都必须保留固定错误，且拒绝 URI/盘符相对位置。</zh-CN><en>All three direct APIs must keep errors fixed and refuse URI/drive-relative locators.</en></lang>
for (const [name, invoke] of [["parser", (p) => parseHtml("<section></section>", { path: p })], ["extractor", (p) => extractHtmlDoc("", { path: p })], ["CEM", (p) => cemManifestToHtmlExtraction({ modules: [] }, { path: p })]]) {
  for (const locator of [`../${sentinel}`, `https://example.invalid/${sentinel}`, `C:${sentinel}`]) {
    test(`${name} refuses and redacts ${locator.split(":")[0]}`, () => {
      assert.throws(() => invoke(locator), (error) => {
        assert.equal(String(error).includes(sentinel), false);
        return true;
      });
    });
  }
}
test("source-map path and content-policy failures never echo caller values", () => {
  const extraction = extractHtmlDoc("<!-- @component Card --><section></section>", { path: "card.html", fragment: true });
  assert.throws(() => createHtmlDocumentationSourceMap({ extraction, extractionPath: `../${sentinel}` }), (error) => !String(error).includes(sentinel));
  assert.throws(() => normalizeSourcesContentPolicy(sentinel), (error) => !String(error).includes(sentinel));
});
// <lang><zh-CN>以真实 parse5 位置核内容；同一行的邻居、CRLF 与非 BMP 不能被 trim/整行切片吞并。</zh-CN><en>Real parse5 locations check content: neighbors on one line, CRLF and non-BMP text must survive without trim/whole-line slicing.</en></lang>
for (const element of ["<section>🔥</section>", "<section>\r\n  content 🔥\r\n</section>"]) {
  test(`embedded fragment exactly follows exclusive UTF-16 range: ${element.includes("\r") ? "multiline" : "same-line"}`, () => {
    const source = `<!-- @component First -->${element}<!-- @component Other --><aside>neighbor</aside>`;
    const artifact = extractHtmlDoc(source, { path: "card.html", fragment: true, sourcesContentPolicy: "embed" });
    const document = htmlExtractionToHiaDocument(artifact);
    assert.equal(document.symbols[0].source.fragments[0].content, element);
    assert.equal(document.symbols[0].source.fragments[0].content.includes("neighbor"), false);
  });
}
test("default none retains no embedded source fragments", () => {
  const artifact = extractHtmlDoc("<!-- @component Card --><section></section>", { path: "card.html", fragment: true });
  assert.equal(artifact.source.sourcesContent, undefined);
  assert.deepEqual(htmlExtractionToHiaDocument(artifact).symbols[0].source.fragments, []);
});
test("runtime provenance converges on package 1.0.0 independently of wire versions", () => {
  const extraction = extractHtmlDoc("", { path: "card.html", fragment: true });
  assert.equal(extraction.producer.version, "1.0.0");
  assert.equal(cemManifestToHtmlExtraction({ modules: [] }).producer.version, "1.0.0");
  assert.equal(createHtmlDocumentationSourceMap({ extraction }).producer.version, "1.0.0");
  assert.equal(HTMDOC_RUNNER_VERSION, "1.0.0");
});
test("new train remains a local candidate and preserves old published inventory", async () => {
  const current = JSON.parse(await readFile(path.join(root, "release/public-packages.json"), "utf8"));
  const legacy = JSON.parse(await readFile(path.join(root, "release/history/public-packages-0.1.0.json"), "utf8"));
  assert.equal(current.candidateVersion, "1.0.0");
  assert.equal(current.releaseStatus, "local-release-candidate");
  assert.ok(current.packages.every((item) => item.status === "local-release-candidate"));
  assert.equal(legacy.candidateVersion, "0.1.0");
  assert.equal(legacy.releaseStatus, "published");
  // <lang><zh-CN>普通 resolver 可读取候选，但显式发布模式仍固定拒绝；不连接 registry 或执行发布。</zh-CN><en>Ordinary resolution reads candidates while explicit publication mode still refuses, without registry access or publication.</en></lang>
  const resolver = path.join(root, "scripts/resolve-release-package.cjs");
  const ordinary = spawnSync(process.execPath, [resolver, "@hia-doc/htmdoc-runner"], { encoding: "utf8" });
  assert.equal(ordinary.status, 0);
  assert.equal(JSON.parse(ordinary.stdout).package_version, "1.0.0");
  const refused = spawnSync(process.execPath, [resolver, "@hia-doc/htmdoc-runner", "--publish-ready"], { encoding: "utf8" });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /not publish-approved/);
});
