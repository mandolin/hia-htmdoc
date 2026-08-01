export const HTMDOC_EXTRACTION_CONTRACT = "hia-htmdoc-extraction";
export const HTMDOC_EXTRACTION_CONTRACT_VERSION = "0.1.0-draft";
export const HTMDOC_EXTRACTION_SCHEMA_ID = "https://hia-doc.local/schema/hia-htmdoc-extraction-0.1.0-draft.json";
export const HTMDOC_PROFILE_VERSION = "0.1.0-draft";

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
        version: { $ref: "#/$defs/nonEmptyString" }
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
        parentId: { $ref: "#/$defs/nonEmptyString" },
        summary: { type: "string" },
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
