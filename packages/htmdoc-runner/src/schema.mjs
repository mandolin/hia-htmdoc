/** @lang zh-CN 已确认的新配置身份；历史 schema 原字节保存在 schema-legacy.mjs。 @lang en Confirmed current config identity; schema-legacy.mjs preserves the historical module bytes. */
export const HTMDOC_CONFIG_SCHEMA_VERSION = "1.0.0";
/** @lang zh-CN 公开规范 URL 仅为身份，不触发读取。 @lang en Canonical public URL is an identity and triggers no reads. */
export const HTMDOC_CONFIG_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/htmdoc-config-1.0.0.schema.json";
/** @lang zh-CN 精确旧 schema 读取入口，不套用新默认。 @lang en Exact historical schema entry without imposing new defaults. */
export {
  HTMDOC_CONFIG_JSON_SCHEMA as HTMDOC_LEGACY_CONFIG_JSON_SCHEMA,
  HTMDOC_CONFIG_SCHEMA_ID as HTMDOC_LEGACY_CONFIG_SCHEMA_ID,
  HTMDOC_CONFIG_SCHEMA_VERSION as HTMDOC_LEGACY_CONFIG_SCHEMA_VERSION
} from "./schema-legacy.mjs";

const relativeDirectory = {
  type: "string",
  minLength: 1,
  not: {
    anyOf: [
      { pattern: "^(?:[A-Za-z]:|/|\\\\|[A-Za-z][A-Za-z0-9+.-]*:)" },
      { pattern: "(?:^|[\\\\/])\\.\\.(?:[\\\\/]|$)" }
    ]
  }
};

/** @lang zh-CN 新 schema 与既有目录/kind 缺省行为一致，不会自动填值或修改输入。 @lang en The new schema matches existing directory/kind defaults without inserting values or mutating input. */
export const HTMDOC_CONFIG_JSON_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HTMDOC_CONFIG_SCHEMA_ID,
  title: "HTMDoc Config",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "inputs"],
  properties: {
    $schema: { const: HTMDOC_CONFIG_SCHEMA_ID },
    schemaVersion: { const: HTMDOC_CONFIG_SCHEMA_VERSION },
    workspaceRoot: { ...relativeDirectory, default: "." },
    outputDirectory: { ...relativeDirectory, default: "dist/htmdoc" },
    inputs: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path"],
        properties: {
          kind: { enum: ["html", "html-fragment", "html-template", "custom-elements-manifest"] },
          path: relativeDirectory,
          language: { type: "string", minLength: 1 }
        }
      }
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        emitDocSourceMap: { type: "boolean" },
        sourcesContentPolicy: { enum: ["none", "reference", "embed"] },
        writeResultManifest: { type: "boolean" }
      }
    },
    profileIds: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", pattern: "^[a-z0-9][a-z0-9._-]*$" }
    }
  }
});
