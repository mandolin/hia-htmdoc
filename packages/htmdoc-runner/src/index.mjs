import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { cemManifestToHtmlExtraction } from "@hia-doc/cem-adapter";
import { htmlExtractionToHiaDocument } from "@hia-doc/html-doc-adapter";
import { extractHtmlDoc } from "@hia-doc/html-doc-extractor";
import { createHtmlDocumentationSourceMap } from "@hia-doc/html-doc-source-map";
import {
  HTMDOC_EXTRACTION_CONTRACT,
  HTMDOC_EXTRACTION_CONTRACT_VERSION
} from "@hia-doc/htmdoc-spec";

/**
 * Owner-local HTML-authoring metadata handoff 评估器。
 *
 * @lang en Owner-local HTML-authoring metadata handoff evaluator.
 * <lang><zh-CN>该 export 只处理 caller-provided metadata；不发现、读取、运行或写入 target，且不接入 host API。</zh-CN><en>This export handles caller-provided metadata only; it does not discover, read, run, or write a target and it integrates no host API.</en></lang>
 */
export {
  HTML_AUTHORING_DOCUMENTATION_HANDOFF_CONTRACT,
  HTML_AUTHORING_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES,
  HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION,
  createHtmlAuthoringDocumentationHandoff
} from "./html-authoring-handoff.mjs";

/**
 * Owner-local HTML-authoring source-comment projection request adapter.
 *
 * 中文：HTML-authoring 源码注释 projection request 的 owner-local adapter。
 * English: Owner-local adapter for HTML-authoring source-comment projection requests.
 * <lang><zh-CN>该 export 只消费 already-materialized extraction/map，不读取 source、不运行 core，也不接入 target host。</zh-CN><en>This export consumes only an already-materialized extraction/map; it reads no source, runs no core, and integrates no target host.</en></lang>
 */
export {
  createHtmlAuthoringSourceCommentProjectionRequest
} from "./html-authoring-source-comment-integration.mjs";

export {
  HTMDOC_CONFIG_JSON_SCHEMA,
  HTMDOC_CONFIG_SCHEMA_ID,
  HTMDOC_CONFIG_SCHEMA_VERSION
} from "./schema.mjs";
import { HTMDOC_CONFIG_SCHEMA_ID, HTMDOC_CONFIG_SCHEMA_VERSION } from "./schema.mjs";

export const HTMDOC_RUNNER_VERSION = "0.0.0";
export const HTMDOC_INPUT_KINDS = Object.freeze([
  "html",
  "html-fragment",
  "html-template",
  "custom-elements-manifest"
]);
export const HTMDOC_OUTPUT_KINDS = Object.freeze([
  "htmdoc-extraction",
  "hia-document",
  "doc-source-map"
]);

const RESULT_CONTRACT = "documentation-producer-result";
const RESULT_CONTRACT_VERSION = "0.1.0-draft";
const PRODUCER_ID = "htmdoc";
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export async function runHtmDoc(request, context = {}) {
  const normalized = normalizeRequest(request);
  await mkdir(normalized.outputDirectory, { recursive: true });

  const artifacts = [];
  const diagnostics = [];
  let completed = 0;

  for (const [index, input] of normalized.inputs.entries()) {
    if (context.signal?.aborted) {
      diagnostics.push(createDiagnostic(
        "HTMDOC_RUNNER_ABORTED",
        "HTMDoc runner was aborted before all inputs completed.",
        "error"
      ));
      break;
    }

    context.reportProgress?.({
      phase: "extract",
      current: index,
      total: normalized.inputs.length,
      message: input.path
    });

    try {
      const generated = await processInput(input, normalized, index);
      artifacts.push(...generated.artifacts);
      diagnostics.push(...generated.diagnostics);
      completed += 1;
    } catch (error) {
      diagnostics.push(createDiagnostic(
        "HTMDOC_RUNNER_INPUT_FAILED",
        `Unable to process HTMDoc input ${input.path} (${errorCode(error)}).`,
        "error",
        input.path
      ));
    }
  }

  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const result = {
    contract: RESULT_CONTRACT,
    contractVersion: RESULT_CONTRACT_VERSION,
    producer: {
      id: PRODUCER_ID,
      version: HTMDOC_RUNNER_VERSION
    },
    status: hasErrors ? (artifacts.length > 0 ? "partial" : "failed") : "success",
    artifacts,
    diagnostics
  };

  if (normalized.options.writeResultManifest) {
    await writeJson(path.join(normalized.outputDirectory, "htmdoc.producer-result.json"), result);
  }

  context.reportProgress?.({
    phase: "complete",
    current: completed,
    total: normalized.inputs.length
  });

  return result;
}

export async function loadHtmDocConfig(configPath, options = {}) {
  const absoluteConfigPath = path.resolve(options.cwd ?? process.cwd(), configPath);
  const config = JSON.parse(await readFile(absoluteConfigPath, "utf8"));
  assertRecord(config, "HTMDoc config must be a JSON object.");
  assertKnownKeys(config, ["$schema", "schemaVersion", "workspaceRoot", "outputDirectory", "inputs", "options", "profileIds"], "config");
  if (config.schemaVersion !== HTMDOC_CONFIG_SCHEMA_VERSION) {
    throw new TypeError(`schemaVersion must be ${HTMDOC_CONFIG_SCHEMA_VERSION}.`);
  }
  if (config.$schema !== undefined && config.$schema !== HTMDOC_CONFIG_SCHEMA_ID) {
    throw new TypeError(`$schema must be ${HTMDOC_CONFIG_SCHEMA_ID}.`);
  }

  const configDirectory = path.dirname(absoluteConfigPath);
  const workspaceDirectory = normalizeConfigDirectory(config.workspaceRoot ?? ".", "workspaceRoot");
  const outputDirectory = normalizeConfigDirectory(config.outputDirectory ?? "dist/htmdoc", "outputDirectory");
  const workspaceRoot = path.resolve(configDirectory, workspaceDirectory);

  return normalizeRequest({
    workspaceRoot,
    outputDirectory: path.resolve(workspaceRoot, outputDirectory),
    inputs: config.inputs,
    options: config.options,
    profileIds: config.profileIds
  });
}

export function inferHtmDocInputKind(inputPath) {
  const normalized = String(inputPath).replaceAll("\\", "/").toLowerCase();
  if (normalized.endsWith("custom-elements.json")) {
    return "custom-elements-manifest";
  }
  if (normalized.endsWith(".template.html") || normalized.endsWith(".template.htm")) {
    return "html-template";
  }
  if (normalized.endsWith(".fragment.html") || normalized.endsWith(".fragment.htm")) {
    return "html-fragment";
  }
  return "html";
}

async function processInput(input, request, index) {
  const sourceFile = path.resolve(request.workspaceRoot, input.path);
  const source = await readFile(sourceFile, "utf8");
  const extraction = input.kind === "custom-elements-manifest"
    ? cemManifestToHtmlExtraction(JSON.parse(source), { path: input.path })
    : extractHtmlDoc(source, {
        path: input.path,
        fragment: input.kind !== "html",
        sourcesContentPolicy: request.options.sourcesContentPolicy
      });
  const document = htmlExtractionToHiaDocument(extraction, {
    id: `htmdoc:${input.path}`,
    title: path.posix.basename(input.path)
  });
  const basePath = outputBasePath(input, index);
  const extractionPath = `${basePath}.htmdoc.json`;
  const hiaDocumentPath = `${basePath}.hia.json`;
  const docSourceMapPath = `${basePath}.docmap.json`;

  await writeJson(path.join(request.outputDirectory, extractionPath), extraction);
  await writeJson(path.join(request.outputDirectory, hiaDocumentPath), document);

  const artifactIdBase = `input-${index + 1}`;
  const artifacts = [
    {
      id: `${artifactIdBase}-extraction`,
      kind: "htmdoc-extraction",
      path: extractionPath,
      contract: HTMDOC_EXTRACTION_CONTRACT,
      contractVersion: HTMDOC_EXTRACTION_CONTRACT_VERSION,
      language: "json",
      mediaType: "application/json",
      profileIds: request.profileIds
    },
    {
      id: `${artifactIdBase}-hia-document`,
      kind: "hia-document",
      path: hiaDocumentPath,
      language: "json",
      mediaType: "application/json",
      profileIds: request.profileIds
    }
  ];

  if (request.options.emitDocSourceMap) {
    const docSourceMap = createHtmlDocumentationSourceMap({
      extraction,
      extractionPath,
      hiaDocumentPath,
      sourcesContentPolicy: request.options.sourcesContentPolicy
    });
    await writeJson(path.join(request.outputDirectory, docSourceMapPath), docSourceMap);
    artifacts.push({
      id: `${artifactIdBase}-doc-source-map`,
      kind: "doc-source-map",
      path: docSourceMapPath,
      contract: "doc-source-map",
      contractVersion: "0.1.0-draft",
      language: "json",
      mediaType: "application/json",
      profileIds: request.profileIds
    });
  }

  return {
    artifacts,
    diagnostics: (extraction.diagnostics ?? []).map((diagnostic) => normalizeDiagnostic(diagnostic, input.path))
  };
}

function normalizeRequest(value) {
  assertRecord(value, "HTMDoc runner request must be an object.");
  assertAbsoluteDirectory(value.workspaceRoot, "workspaceRoot");
  assertAbsoluteDirectory(value.outputDirectory, "outputDirectory");
  if (!Array.isArray(value.inputs) || value.inputs.length === 0) {
    throw new TypeError("inputs must be a non-empty array.");
  }

  const inputs = value.inputs.map((input, index) => {
    assertRecord(input, `inputs[${index}] must be an object.`);
    assertKnownKeys(input, ["kind", "path", "language"], `inputs[${index}]`);
    const inputPath = normalizeSafeRelativePath(input.path, `inputs[${index}].path`);
    const kind = input.kind ?? inferHtmDocInputKind(inputPath);
    if (!HTMDOC_INPUT_KINDS.includes(kind)) {
      throw new TypeError(`Unsupported HTMDoc input kind: ${kind}`);
    }
    return {
      kind,
      path: inputPath,
      ...(typeof input.language === "string" ? { language: input.language } : {})
    };
  });

  const runnerOptions = value.options ?? {};
  assertRecord(runnerOptions, "options must be an object.");
  assertKnownKeys(runnerOptions, ["emitDocSourceMap", "sourcesContentPolicy", "writeResultManifest"], "options");
  const sourcesContentPolicy = runnerOptions.sourcesContentPolicy ?? "none";
  if (!['none', 'reference', 'embed'].includes(sourcesContentPolicy)) {
    throw new TypeError(`Unsupported sourcesContentPolicy: ${sourcesContentPolicy}`);
  }
  const profileIds = value.profileIds ?? ["htmdoc"];
  if (!Array.isArray(profileIds) || profileIds.length === 0 || profileIds.some((id) => typeof id !== "string" || !SAFE_ID_PATTERN.test(id))) {
    throw new TypeError("profileIds must be a non-empty array of lower-case identifiers.");
  }

  return {
    workspaceRoot: path.resolve(value.workspaceRoot),
    outputDirectory: path.resolve(value.outputDirectory),
    inputs,
    profileIds: [...profileIds],
    options: {
      emitDocSourceMap: runnerOptions.emitDocSourceMap !== false,
      sourcesContentPolicy,
      writeResultManifest: runnerOptions.writeResultManifest !== false
    }
  };
}

function outputBasePath(input, index) {
  const parsed = path.posix.parse(input.path);
  const directory = parsed.dir ? `${parsed.dir}/` : "";
  return normalizeSafeRelativePath(
    `artifacts/${directory}${parsed.name}.${slug(input.kind)}-${index + 1}`,
    "artifact base path"
  );
}

function normalizeDiagnostic(diagnostic, fallbackPath) {
  const severity = diagnostic?.severity === "error" || diagnostic?.severity === "warning" || diagnostic?.severity === "info"
    ? diagnostic.severity
    : "info";
  const diagnosticPath = typeof diagnostic?.path === "string" && isSafeRelativePath(diagnostic.path)
    ? diagnostic.path.replaceAll("\\", "/")
    : fallbackPath;
  return {
    code: typeof diagnostic?.code === "string" ? diagnostic.code : "HTMDOC_RUNNER_DIAGNOSTIC",
    message: typeof diagnostic?.message === "string" ? diagnostic.message : "HTMDoc runner diagnostic.",
    severity,
    path: diagnosticPath,
    ...(isJsonObject(diagnostic?.data) ? { data: diagnostic.data } : {})
  };
}

function createDiagnostic(code, message, severity, diagnosticPath) {
  return {
    code,
    message,
    severity,
    ...(diagnosticPath ? { path: diagnosticPath } : {})
  };
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeSafeRelativePath(value, label) {
  if (typeof value !== "string" || !isSafeRelativePath(value)) {
    throw new TypeError(`${label} must be a safe relative path.`);
  }
  return value.replaceAll("\\", "/");
}

function isSafeRelativePath(value) {
  const normalized = String(value).replaceAll("\\", "/");
  return Boolean(normalized)
    && !path.posix.isAbsolute(normalized)
    && !path.win32.isAbsolute(value)
    && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized)
    && !normalized.split("/").includes("..");
}

function normalizeConfigDirectory(value, label) {
  if (typeof value !== "string" || path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    throw new TypeError(`${label} must be relative to the config/project directory.`);
  }
  const normalized = value.replaceAll("\\", "/");
  if (!normalized || normalized.split("/").includes("..")) {
    throw new TypeError(`${label} must not escape its base directory.`);
  }
  return normalized;
}

function assertAbsoluteDirectory(value, label) {
  if (typeof value !== "string" || (!path.posix.isAbsolute(value) && !path.win32.isAbsolute(value))) {
    throw new TypeError(`${label} must be an absolute runtime path.`);
  }
}

function assertKnownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new TypeError(`${label}.${key} is not supported.`);
    }
  }
}

function assertRecord(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(message);
  }
}

function isJsonObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function errorCode(error) {
  return typeof error?.code === "string" ? error.code : error?.name ?? "Error";
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "input";
}
