/** @lang zh-CN 提取工件的固定中性身份，与包版本独立。 @lang en Fixed extraction artifact identity, independent of package versions. */
export const HTMDOC_EXTRACTION_CONTRACT = "hia-htmdoc-extraction";
/** @lang zh-CN 已确认的新版提取 wire 身份，旧版仍精确可读。 @lang en Confirmed current extraction wire identity with exact historical reading retained. */
export const HTMDOC_EXTRACTION_CONTRACT_VERSION = "1.0.0";
/** @lang zh-CN 公开 schema 身份，不执行网络请求。 @lang en Public schema identity without network requests. */
export const HTMDOC_EXTRACTION_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/hia-htmdoc-extraction-1.0.0.schema.json";
/** @lang zh-CN 已确认 annotation/CEM 子集的 profile 身份，不表示全生态支持。 @lang en Profile identity for the confirmed annotation/CEM subset, not full ecosystem support. */
export const HTMDOC_PROFILE_VERSION = "1.0.0";
import * as legacyExtraction from "./schema-legacy.mjs";
/** @lang zh-CN 原档案提取schema的同一对象，不克隆或修改旧规则。 @lang en The original archived extraction-schema object without cloning or changing historical rules. */
export const HTMDOC_LEGACY_EXTRACTION_JSON_SCHEMA = legacyExtraction.HTMDOC_EXTRACTION_JSON_SCHEMA;
/** @lang zh-CN 原档案提取schema身份，不读取URL。 @lang en Original archived extraction-schema identity, without URL reads. */
export const HTMDOC_LEGACY_EXTRACTION_SCHEMA_ID = legacyExtraction.HTMDOC_EXTRACTION_SCHEMA_ID;
/** @lang zh-CN 原档案提取契约版本，不以当前版本替代旧语义。 @lang en Original archived extraction-contract version, never substituting current semantics. */
export const HTMDOC_LEGACY_EXTRACTION_CONTRACT_VERSION = legacyExtraction.HTMDOC_EXTRACTION_CONTRACT_VERSION;
/** @lang zh-CN 原档案领域profile版本，独立于包与全局规范版本。 @lang en Original archived domain-profile version, independent of package and global-specification versions. */
export const HTMDOC_LEGACY_PROFILE_VERSION = legacyExtraction.HTMDOC_PROFILE_VERSION;
/** @lang zh-CN 新旧精确读取和显式迁移均为无 I/O 纯 API。 @lang en Exact version reading and explicit migration are pure APIs without I/O. */
export { getHtmDocExtractionSchema, validateHtmDocExtraction, migrateHtmDocExtraction } from "./compatibility.mjs";

/**
 * Owner-local output conformance evaluator for already-generated HTMDoc artifacts.
 *
 * 中文：针对已生成 HTMDoc artifact 的 owner-local output conformance evaluator。
 * English: Owner-local output conformance evaluator for already-generated HTMDoc artifacts.
 * @lang zh-CN 该 evaluator 不读取 source、不写入 artifact，也不成为跨仓 runtime capability schema。
 */
export {
  evaluateHtmDocOutputConformance,
  HTMDOC_OUTPUT_CONFORMANCE_CODES,
  HTMDOC_OUTPUT_CONFORMANCE_CONTRACT,
  HTMDOC_OUTPUT_CONFORMANCE_VERSION
} from "./output-conformance.mjs";

/** @lang zh-CN 已确认 HTML-facing 符号 kind 注册；与 CEM 的 JS metadata 区分。 @lang en Confirmed HTML-facing kind registry, distinct from CEM JavaScript metadata. */
export const HTMDOC_SYMBOL_KINDS = Object.freeze({
  /**
   * @lang zh-CN HTML组件文档节点的领域种类。
   * @lang en Domain kind for an HTML component documentation node.
   */
  component: "html-component",
  /**
   * @lang zh-CN HTML元素文档节点的领域种类。
   * @lang en Domain kind for an HTML element documentation node.
   */
  element: "html-element",
  /**
   * @lang zh-CN HTML模板文档节点的领域种类。
   * @lang en Domain kind for an HTML template documentation node.
   */
  template: "html-template",
  /**
   * @lang zh-CN HTML属性文档节点的领域种类。
   * @lang en Domain kind for an HTML attribute documentation node.
   */
  attribute: "html-attribute",
  /**
   * @lang zh-CN HTML插槽文档节点的领域种类。
   * @lang en Domain kind for an HTML slot documentation node.
   */
  slot: "html-slot",
  /**
   * @lang zh-CN HTML事件文档节点的领域种类。
   * @lang en Domain kind for an HTML event documentation node.
   */
  event: "html-event",
  /**
   * @lang zh-CN HTML样式挂钩文档节点的领域种类。
   * @lang en Domain kind for an HTML style-hook documentation node.
   */
  styleHook: "html-style-hook",
  /**
   * @lang zh-CN HTML可访问性说明节点的领域种类。
   * @lang en Domain kind for an HTML accessibility-note node.
   */
  a11yNote: "html-a11y-note",
  /**
   * @lang zh-CN HTML示例文档节点的领域种类。
   * @lang en Domain kind for an HTML example documentation node.
   */
  example: "html-example"
});
/** @lang zh-CN 复用包内纯数据定义的同一冻结对象。 @lang en Reuses the same frozen objects from owner-local plain-data definitions. */
import {HTMDOC_TAGS} from './frozen-arrays.mjs';
export {HTMDOC_TAGS};

/** @lang zh-CN 新版稳定子集 schema；nullable 为已确认新规则，旧 schema 不随之变化。 @lang en Current stable-subset schema; nullable support is a confirmed new rule that does not change the legacy schema. */
export const HTMDOC_EXTRACTION_JSON_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HTMDOC_EXTRACTION_SCHEMA_ID,
  type: "object",
  required: ["contract", "contractVersion", "producer", "profile", "source", "symbols", "annotations", "diagnostics", "sourceMap"],
  additionalProperties: true,
  properties: {
    contract: { const: HTMDOC_EXTRACTION_CONTRACT },
    contractVersion: { const: HTMDOC_EXTRACTION_CONTRACT_VERSION },
    producer: { $ref: "#/$defs/producer" },
    profile: { $ref: "#/$defs/profile" },
    source: { $ref: "#/$defs/source" },
    symbols: {
      type: "array",
      items: { $ref: "#/$defs/symbol" }
    },
    annotations: {
      type: "array",
      items: { type: "object" }
    },
    diagnostics: {
      type: "array",
      items: { $ref: "#/$defs/diagnostic" }
    },
    sourceMap: { type: "object" },
    metadata: { type: "object" }
  },
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    producer: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: true,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        version: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    profile: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: true,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        version: { const: HTMDOC_PROFILE_VERSION }
      }
    },
    source: {
      type: "object",
      required: ["kind", "path"],
      additionalProperties: true,
      properties: {
        kind: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/nonEmptyString" },
        sourcesContent: { type: "string" }
      }
    },
    sourcePosition: {
      type: "object",
      required: ["line"],
      additionalProperties: true,
      properties: {
        line: { type: "integer", minimum: 1 },
        column: { type: "integer", minimum: 1 }
      }
    },
    sourceRange: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          required: ["start"],
          additionalProperties: true,
          properties: {
            start: { $ref: "#/$defs/sourcePosition" },
            end: { $ref: "#/$defs/sourcePosition" }
          }
        }
      ]
    },
    symbol: {
      type: "object",
      required: ["id", "kind", "name", "source"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        kind: { enum: Object.values(HTMDOC_SYMBOL_KINDS) },
        name: { $ref: "#/$defs/nonEmptyString" },
        parentId: { anyOf: [{ $ref: "#/$defs/nonEmptyString" }, { type: "null" }] },
        summary: { type: ["string", "null"] },
        source: {
          type: "object",
          required: ["path"],
          additionalProperties: true,
          properties: {
            path: { $ref: "#/$defs/nonEmptyString" },
            range: { $ref: "#/$defs/sourceRange" }
          }
        },
        annotation: { type: "object" },
        metadata: { type: "object" }
      }
    },
    diagnostic: {
      type: "object",
      required: ["code", "message", "severity"],
      additionalProperties: true,
      properties: {
        code: { $ref: "#/$defs/nonEmptyString" },
        message: { $ref: "#/$defs/nonEmptyString" },
        severity: { enum: ["info", "warning", "error"] },
        path: { $ref: "#/$defs/nonEmptyString" },
        data: { type: "object" }
      }
    }
  }
});

/** @lang zh-CN 显式映射只可通过自有属性读取，不能把对象原型变成语言标签。 @lang en Read explicit mappings through own properties only, never promoting object prototypes into language tags. */
const TAG_TO_KIND = Object.freeze({
  component: HTMDOC_SYMBOL_KINDS.component,
  element: HTMDOC_SYMBOL_KINDS.element,
  template: HTMDOC_SYMBOL_KINDS.template,
  attr: HTMDOC_SYMBOL_KINDS.attribute,
  slot: HTMDOC_SYMBOL_KINDS.slot,
  event: HTMDOC_SYMBOL_KINDS.event,
  stylehook: HTMDOC_SYMBOL_KINDS.styleHook,
  a11y: HTMDOC_SYMBOL_KINDS.a11yNote,
  example: HTMDOC_SYMBOL_KINDS.example
});

/** @param {string} tag <lang><zh-CN>已规范化的小写标签，不执行类型转换。</zh-CN><en>Normalized lowercase tag without coercion.</en></lang> @returns {string|null} <lang><zh-CN>只返回自有 registry kind；未知/非字符串返回 null。</zh-CN><en>Own registry kind only; unknown/nonstring inputs return null.</en></lang> */
export function getHtmlDocSymbolKind(tag) {
  return typeof tag === "string" && Object.hasOwn(TAG_TO_KIND, tag) ? TAG_TO_KIND[tag] : null;
}

/** @param {string} tag <lang><zh-CN>区分大小写的规范标签。</zh-CN><en>Case-sensitive canonical tag.</en></lang> @returns {boolean} <lang><zh-CN>包含 description/lang 在内的显式标签注册；不修改输入。</zh-CN><en>Explicit registration including description/lang; input is unchanged.</en></lang> */
export function isHtmlDocTag(tag) {
  return HTMDOC_TAGS.includes(tag);
}
