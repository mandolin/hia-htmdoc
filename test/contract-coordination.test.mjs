/**
 * @file Confirmed HTML contract coordination regressions.
 * @lang zh-CN 验证 ADR-WP144-003 B 的三项身份、精确旧读、无损迁移及真实生成链；所有样本只在隔离临时目录。
 * @lang en Verifies ADR-WP144-003 B identities, exact legacy reads, lossless migration and real generation using isolated temporary fixtures only.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as spec from "../packages/htmdoc-spec/src/index.mjs";
import * as runner from "../packages/htmdoc-runner/src/index.mjs";
import { extractHtmlDoc } from "../packages/html-doc-extractor/src/index.mjs";
import { cemManifestToHtmlExtraction } from "../packages/cem-adapter/src/index.mjs";
import { htmlExtractionToHiaDocument } from "../packages/html-doc-adapter/src/index.mjs";
import { createHtmlDocumentationSourceMap } from "../packages/html-doc-source-map/src/index.mjs";
import Ajv2020 from "ajv/dist/2020.js";

/** @lang zh-CN 实际 parser 可定位的双语组件。 @lang en Real parser-locatable bilingual component. */
const source = "<!-- @component Card -->\n<section></section>";
/** @returns {object} <lang><zh-CN>独立的普通 JSON 提取件。</zh-CN><en>Independent ordinary-JSON extraction.</en></lang> */
function extraction() { return JSON.parse(JSON.stringify(extractHtmlDoc(source, { path: "card.html", fragment: true }))); }
/** @returns {object} <lang><zh-CN>保持结构/扩展的精确旧身份样本，不模拟旧源码执行。</zh-CN><en>Exact legacy identity fixture retaining structure/extensions, not a claimed execution of old source.</en></lang> */
function legacyExtraction() {
  // <lang><zh-CN>只为测试 reader 构造身份对照，真实历史工件另由冻结 fixture 复核。</zh-CN><en>Build an identity control for reader tests; frozen fixtures separately check real historical artifacts.</en></lang>
  const value = extraction();
  value.contractVersion = "0.1.0-draft";
  value.profile.version = "0.1.0-draft";
  value.metadata.extension = { preserved: [1, "text", null] };
  return value;
}
test("HTML config/extraction/profile current identities are coordinated 1.0.0", () => {
  assert.equal(runner.HTMDOC_CONFIG_SCHEMA_VERSION, "1.0.0");
  assert.equal(spec.HTMDOC_EXTRACTION_CONTRACT_VERSION, "1.0.0");
  assert.equal(spec.HTMDOC_PROFILE_VERSION, "1.0.0");
  assert.equal(extraction().contractVersion, "1.0.0");
  assert.equal(cemManifestToHtmlExtraction({ modules: [] }).contractVersion, "1.0.0");
});
test("exact legacy and current schemas remain separate, unknown versions have no schema", () => {
  assert.equal(runner.getHtmDocConfigSchema("0.1.0-draft").properties.schemaVersion.const, "0.1.0-draft");
  assert.equal(runner.getHtmDocConfigSchema("1.0.0").properties.schemaVersion.const, "1.0.0");
  assert.equal(spec.getHtmDocExtractionSchema("0.1.0-draft").properties.contractVersion.const, "0.1.0-draft");
  assert.equal(spec.getHtmDocExtractionSchema("1.0.0").properties.contractVersion.const, "1.0.0");
  assert.equal(runner.getHtmDocConfigSchema("1.0.1"), undefined);
  assert.equal(spec.getHtmDocExtractionSchema("1.0.1"), undefined);
});
test("config migration preserves every field and input object", () => {
  // <lang><zh-CN>精确旧 schema URL 在显式迁移中同步，目录/输入省略仍保留以供新默认。</zh-CN><en>Explicit migration coordinates the legacy schema URL while preserving omissions for new defaults.</en></lang>
  const value = { schemaVersion: "0.1.0-draft", $schema: runner.HTMDOC_LEGACY_CONFIG_SCHEMA_ID, inputs: [{ path: "card.html" }], options: { writeResultManifest: false } };
  const before = JSON.stringify(value);
  const migrated = runner.migrateHtmDocConfig(value);
  assert.equal(migrated.schemaVersion, "1.0.0");
  assert.equal(migrated.$schema, runner.HTMDOC_CONFIG_SCHEMA_ID);
  assert.deepEqual(migrated.inputs, value.inputs);
  assert.deepEqual(migrated.options, value.options);
  assert.equal(JSON.stringify(value), before);
  assert.notEqual(migrated.inputs, value.inputs);
});
test("extraction migration preserves data/extensions and only coordinates identities", () => {
  const value = legacyExtraction();
  const before = JSON.stringify(value);
  const migrated = spec.migrateHtmDocExtraction(value);
  assert.equal(migrated.contractVersion, "1.0.0");
  assert.equal(migrated.profile.version, "1.0.0");
  assert.deepEqual({ ...migrated, contractVersion: value.contractVersion, profile: value.profile }, value);
  assert.equal(JSON.stringify(value), before);
  assert.notEqual(migrated.metadata, value.metadata);
  assert.deepEqual(spec.validateHtmDocExtraction(migrated), []);
});
// <lang><zh-CN>未知或无效旧值必须拒绝，不能以替换版本号冒充迁移。</zh-CN><en>Unknown or invalid legacy values must reject instead of masquerading as migration through relabeling.</en></lang>
for (const [name, change] of [["unknown version", (v) => {v.contractVersion = "9.0.0";}], ["missing source", (v) => {delete v.source;}], ["invalid symbol", (v) => {v.symbols[0].name = 42;}], ["wrong profile", (v) => {v.profile.version = "9.0.0";}], ["non-JSON", (v) => {v.metadata.extension = undefined;}]]) {
  test(`extraction migration rejects ${name} without raw input`, () => {
    const value = legacyExtraction();
    change(value);
    assert.throws(() => spec.migrateHtmDocExtraction(value), TypeError);
  });
}
test("new nullable fields validate without weakening legacy schema", () => {
  const value = extraction();
  value.symbols[0].parentId = null;
  value.symbols[0].summary = null;
  assert.deepEqual(spec.validateHtmDocExtraction(value), []);
  assert.deepEqual(spec.HTMDOC_LEGACY_EXTRACTION_JSON_SCHEMA.$defs.symbol.properties.summary, { type: "string" });
});
test("adapter accepts exact old/new artifacts and rejects unknown extraction versions", () => {
  assert.ok(htmlExtractionToHiaDocument(legacyExtraction()).symbols.length);
  assert.ok(htmlExtractionToHiaDocument(extraction()).symbols.length);
  const unknown = extraction();
  unknown.contractVersion = "9.0.0";
  assert.throws(() => htmlExtractionToHiaDocument(unknown), TypeError);
});
test("current parse5 chain retains proven map range conventions", () => {
  const map = createHtmlDocumentationSourceMap({ extraction: extraction() });
  assert.equal(map.artifacts[0].contractRefs[0].contractVersion, "1.0.0");
  assert.equal(map.entries[0].sourceRefs[0].rangeConvention.endBoundary, "exclusive");
  const unknown = extraction();
  unknown.contractVersion = "9.0.0";
  assert.throws(() => createHtmlDocumentationSourceMap({ extraction: unknown }));
});
test("config loader accepts exact old/new identities with existing omitted defaults", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "htmdoc-contract-"));
  try {
    for (const schemaVersion of ["0.1.0-draft", "1.0.0"]) {
      await writeFile(path.join(root, "config.json"), JSON.stringify({ schemaVersion, inputs: [{ path: "card.html" }] }));
      const result = await runner.loadHtmDocConfig(path.join(root, "config.json"));
      assert.equal(result.workspaceRoot, root);
      assert.equal(result.outputDirectory, path.join(root, "dist/htmdoc"));
      assert.equal(result.inputs[0].kind, "html");
    }
  } finally {
    assert.equal(path.dirname(root), tmpdir());
    await rm(root, { recursive: true, force: true });
  }
});
test("frozen historical extraction fixture remains readable", async () => {
  const old = JSON.parse(await readFile(new URL("./fixtures/template-legacy.htmdoc.json", import.meta.url), "utf8"));
  assert.equal(old.contractVersion, "0.1.0-draft");
  assert.deepEqual(spec.validateHtmDocExtraction(old), []);
  assert.ok(htmlExtractionToHiaDocument(spec.migrateHtmDocExtraction(old)).symbols.length);
});
// <lang><zh-CN>无损迁移不能允许 JSON.stringify 静默删除或改值的输入。</zh-CN><en>Lossless migration cannot permit inputs that JSON.stringify silently deletes or changes.</en></lang>
for (const [name, extra] of [["undefined", undefined], ["function", () => {}], ["nonfinite", Infinity], ["date", new Date(0)], ["sparse", new Array(2)]]) {
  test(`both migrations reject ${name} extensions`, () => {
    const value = legacyExtraction();
    value.metadata.extension = extra;
    assert.throws(() => spec.migrateHtmDocExtraction(value), TypeError);
    assert.throws(() => runner.migrateHtmDocConfig({ schemaVersion: "0.1.0-draft", inputs: [{ path: "card.html" }], options: { extra } }), TypeError);
  });
}
test("migration rejects getters without executing them, and rejects cycles", () => {
  let calls = 0;
  const value = legacyExtraction();
  Object.defineProperty(value.metadata, "getter", { enumerable: true, get() { calls++; return "private"; } });
  assert.throws(() => spec.migrateHtmDocExtraction(value), TypeError);
  assert.equal(calls, 0);
  const config = { schemaVersion: "0.1.0-draft", inputs: [{ path: "card.html" }] };
  config.options = config;
  assert.throws(() => runner.migrateHtmDocConfig(config), TypeError);
});
test("new schemas validate actual producer outputs and preserve exact old schema defaults", () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const validate = ajv.compile(spec.HTMDOC_EXTRACTION_JSON_SCHEMA);
  assert.equal(validate(extraction()), true, JSON.stringify(validate.errors));
  assert.equal(validate(cemManifestToHtmlExtraction({ modules: [] })), true, JSON.stringify(validate.errors));
  const config = { schemaVersion: "1.0.0", inputs: [{ path: "card.html" }] };
  assert.equal(ajv.compile(runner.HTMDOC_CONFIG_JSON_SCHEMA)(config), true);
  assert.deepEqual(runner.HTMDOC_LEGACY_CONFIG_JSON_SCHEMA.required, ["schemaVersion", "workspaceRoot", "outputDirectory", "inputs"]);
  assert.deepEqual(runner.HTMDOC_LEGACY_CONFIG_JSON_SCHEMA.properties.inputs.items.required, ["kind", "path"]);
});
