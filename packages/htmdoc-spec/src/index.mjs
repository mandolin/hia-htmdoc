/** @lang zh-CN 提取工件的固定中性身份，与包版本独立。 @lang en Fixed extraction artifact identity, independent of package versions. */
export const HTMDOC_EXTRACTION_CONTRACT = "hia-htmdoc-extraction";
/** @lang zh-CN 已确认的新版提取 wire 身份，旧版仍精确可读。 @lang en Confirmed current extraction wire identity with exact historical reading retained. */
export const HTMDOC_EXTRACTION_CONTRACT_VERSION = "1.0.0";
/** @lang zh-CN 公开 schema 身份，不执行网络请求。 @lang en Public schema identity without network requests. */
export const HTMDOC_EXTRACTION_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/hia-htmdoc-extraction-1.0.0.schema.json";
/** @lang zh-CN 已确认 annotation/CEM 子集的 profile 身份，不表示全生态支持。 @lang en Profile identity for the confirmed annotation/CEM subset, not full ecosystem support. */
export const HTMDOC_PROFILE_VERSION = "1.0.0";
/** @lang zh-CN 不改写历史 schema，精确旧对象来自原模块档案。 @lang en Historical schemas remain unchanged and come from the original module archive. */
export {
  HTMDOC_EXTRACTION_JSON_SCHEMA as HTMDOC_LEGACY_EXTRACTION_JSON_SCHEMA,
  HTMDOC_EXTRACTION_SCHEMA_ID as HTMDOC_LEGACY_EXTRACTION_SCHEMA_ID,
  HTMDOC_EXTRACTION_CONTRACT_VERSION as HTMDOC_LEGACY_EXTRACTION_CONTRACT_VERSION,
  HTMDOC_PROFILE_VERSION as HTMDOC_LEGACY_PROFILE_VERSION
} from "./schema-legacy.mjs";
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

export const HTMDOC_SYMBOL_KINDS = Object.freeze({
  component: "html-component",
  element: "html-element",
  template: "html-template",
  attribute: "html-attribute",
  slot: "html-slot",
  event: "html-event",
  styleHook: "html-style-hook",
  a11yNote: "html-a11y-note",
  example: "html-example"
});

export const HTMDOC_TAGS = Object.freeze([
  "component",
  "element",
  "template",
  "attr",
  "slot",
  "event",
  "stylehook",
  "a11y",
  "description",
  "example",
  "lang"
]);

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

export function getHtmlDocSymbolKind(tag) {
  return TAG_TO_KIND[tag] ?? null;
}

export function isHtmlDocTag(tag) {
  return HTMDOC_TAGS.includes(tag);
}
