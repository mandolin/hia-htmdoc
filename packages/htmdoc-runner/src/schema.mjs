export const HTMDOC_CONFIG_SCHEMA_VERSION = "0.1.0-draft";
export const HTMDOC_CONFIG_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/htmdoc-config-0.1.0-draft.schema.json";

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

export const HTMDOC_CONFIG_JSON_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HTMDOC_CONFIG_SCHEMA_ID,
  title: "HTMDoc Config",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "workspaceRoot", "outputDirectory", "inputs"],
  properties: {
    $schema: { const: HTMDOC_CONFIG_SCHEMA_ID },
    schemaVersion: { const: HTMDOC_CONFIG_SCHEMA_VERSION },
    workspaceRoot: relativeDirectory,
    outputDirectory: relativeDirectory,
    inputs: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "path"],
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
