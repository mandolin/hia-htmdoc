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
  HTMDOC_CONFIG_SCHEMA_VERSION,
  HTMDOC_LEGACY_CONFIG_JSON_SCHEMA,
  HTMDOC_LEGACY_CONFIG_SCHEMA_ID,
  HTMDOC_LEGACY_CONFIG_SCHEMA_VERSION
} from "./schema.mjs";
/** @lang zh-CN 精确 schema 查询和显式无损迁移；不读文件或改调用者对象。 @lang en Exact schema lookup and explicit lossless migration without file reads or caller mutation. */
export { getHtmDocConfigSchema, migrateHtmDocConfig } from "./config-compatibility.mjs";
import { getHtmDocConfigSchema, validateHtmDocConfigForReading } from "./config-compatibility.mjs";
import { HTMDOC_CONFIG_SCHEMA_ID, HTMDOC_CONFIG_SCHEMA_VERSION } from "./schema.mjs";

/**
 * HTMDoc runner public package version.
 *
 * @lang zh-CN 写入 producer descriptor/result 的精确实现版本；它与 draft contract version 是不同维度。
 * @lang en Exact implementation version written to producer descriptors/results; it is independent from draft contract versions.
 */
export const HTMDOC_RUNNER_VERSION = "1.0.0";
/** @lang zh-CN 单次构建支持的四种显式输入；缺省 kind 由已有文件名规则推断。 @lang en Four supported build inputs; omitted kinds follow the existing filename inference. */
export const HTMDOC_INPUT_KINDS = Object.freeze([
  "html",
  "html-fragment",
  "html-template",
  "custom-elements-manifest"
]);
/** @lang zh-CN 提取件、核心文档和可选源码地图；不是可见站点布局能力。 @lang en Extraction, core documents and optional source maps, not site layout capabilities. */
export const HTMDOC_OUTPUT_KINDS = Object.freeze([
  "htmdoc-extraction",
  "hia-document",
  "doc-source-map"
]);

const RESULT_CONTRACT = "documentation-producer-result";
/** @lang zh-CN 新 writer 采用已确认 SDK 1.0.0，保存的历史结果不重标。 @lang en New writers use the confirmed SDK 1.0.0 without relabeling saved legacy results. */
const RESULT_CONTRACT_VERSION = "1.0.0";
const PRODUCER_ID = "htmdoc";
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/**
 * @param {object} request <lang><zh-CN>绝对运行根/输出根、非空相对输入、可选布尔与源码策略和唯一 profileIds。</zh-CN><en>Absolute runtime/output roots, nonempty relative inputs, optional booleans/source policy and unique profileIds.</en></lang>
 * @param {object} [context] <lang><zh-CN>中止信号与同步进度回调；回调异常向调用方传播。</zh-CN><en>Abort signal and synchronous progress callback; callback errors propagate to the caller.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>SDK 1.0.0 结果；单输入失败记诊断并继续，无输出回滚。</zh-CN><en>SDK 1.0.0 result; per-input failures become diagnostics and processing continues without output rollback.</en></lang>
 * @throws {TypeError|Error} <lang><zh-CN>请求类型/路径在写盘前拒绝；输出根/清单 I/O 或回调错误向上传播。</zh-CN><en>Request types/paths reject before writes; output-root/manifest I/O and callback errors propagate.</en></lang>
 * @lang zh-CN 共享 HTML/CEM 一次性流水线，默认生成地图及结果清单，源码内容默认 none。
 * @lang en Shared one-shot HTML/CEM pipeline; maps and result manifests default on, source content defaults to none.
 */
export async function runHtmDoc(request, context = {}) {
  // <lang><zh-CN>先完成纯规范化，再创建目录，非法声明无输出副作用。</zh-CN><en>Finish pure normalization before creating directories, so invalid declarations have no output effects.</en></lang>
  const normalized = normalizeRequest(request);
  await mkdir(normalized.outputDirectory, { recursive: true });

  // <lang><zh-CN>只累计本轮登记的工件和公开诊断，旧文件不属于本次结果。</zh-CN><en>Accumulate only artifacts registered this run and public diagnostics; existing files are not this result.</en></lang>
  const artifacts = [];
  const diagnostics = [];
  // <lang><zh-CN>成功处理的输入计数仅供宿主进度使用，不等于生成文件数。</zh-CN><en>Completed input count serves host progress and is not a file count.</en></lang>
  let completed = 0;

  // <lang><zh-CN>逐输入隔离转换失败；中止只阻止后续输入，不回滚已写文件。</zh-CN><en>Isolate conversion failures per input; abortion stops later inputs without rolling back written files.</en></lang>
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
      // <lang><zh-CN>单输入完全返回后才向本轮清单登记其产物。</zh-CN><en>Register an input's artifacts only after its processing returns completely.</en></lang>
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

  // <lang><zh-CN>SDK 以已登记工件和 error 决定状态，不根据磁盘上旧文件猜成功。</zh-CN><en>SDK status follows registered artifacts and errors, never stale files on disk.</en></lang>
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  // <lang><zh-CN>结果仅保留相对定位器；运行根不进入 wire 对象。</zh-CN><en>The result retains relative locators only; runtime roots never enter the wire object.</en></lang>
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

/**
 * @param {string} configPath <lang><zh-CN>调用方选定的配置文件定位器。</zh-CN><en>Caller-selected configuration locator.</en></lang>
 * @param {{cwd?:string}} [options] <lang><zh-CN>解析相对配置路径的运行基准，默认当前目录。</zh-CN><en>Runtime base for relative config paths, defaulting to cwd.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>按旧版既有默认值解析后的内存请求；不生成产物。</zh-CN><en>In-memory request using existing legacy defaults; generates no artifacts.</en></lang>
 * @throws {TypeError} <lang><zh-CN>读取、JSON 或已声明输入不合法时抛固定错误，不回显原始 JSON/定位器。</zh-CN><en>Throws redacted errors for read, JSON or declared-input failures without raw JSON/locators.</en></lang>
 * @lang zh-CN 此修复不改旧 schema 的 required/default 冲突；新版本规则另经确认。
 * @lang en This fix does not rewrite the legacy schema's required/default conflict; new-version rules require separate confirmation.
 */
export async function loadHtmDocConfig(configPath, options = {}) {
  // <lang><zh-CN>文件定位器仅用于本次读取，不附加到公开失败信息。</zh-CN><en>The locator is used only for this read and never appended to public errors.</en></lang>
  const absoluteConfigPath = path.resolve(options.cwd ?? process.cwd(), configPath);
  // <lang><zh-CN>读取和 JSON 解析异常可能携带绝对路径/原文，统一转换为固定错误。</zh-CN><en>Read and JSON parsing failures may contain absolute paths/text, so replace them with a fixed error.</en></lang>
  let config;
  try {
    config = JSON.parse(await readFile(absoluteConfigPath, "utf8"));
  } catch {
    throw new TypeError("HTMDoc config could not be read as JSON.");
  }
  assertRecord(config, "HTMDoc config must be a JSON object.");
  // <lang><zh-CN>旧/新身份与结构分别核验；旧默认行为不冒充旧 schema 的断言。</zh-CN><en>Check exact legacy/current identity and structure separately; legacy defaults do not masquerade as legacy schema assertions.</en></lang>
  validateHtmDocConfigForReading(config);
  assertKnownKeys(config, ["$schema", "schemaVersion", "workspaceRoot", "outputDirectory", "inputs", "options", "profileIds"], "config");
  const configSchema = getHtmDocConfigSchema(config.schemaVersion);
  if (config.$schema !== undefined && config.$schema !== configSchema.$id) throw new TypeError("Unsupported HTMDoc config schema identity.");

  // <lang><zh-CN>以下定位器只保留在返回的内存请求中；旧版缺省规则保持。</zh-CN><en>These locators stay in the returned in-memory request only; existing legacy defaults remain.</en></lang>
  const configDirectory = path.dirname(absoluteConfigPath);
  const workspaceDirectory = normalizeConfigDirectory(config.workspaceRoot === undefined ? "." : config.workspaceRoot, "workspaceRoot");
  const outputDirectory = normalizeConfigDirectory(config.outputDirectory === undefined ? "dist/htmdoc" : config.outputDirectory, "outputDirectory");
  // <lang><zh-CN>配置目录与 workspace 相对定位器组合成只在内存使用的绝对根。</zh-CN><en>Combine the config directory and workspace-relative locator into an in-memory absolute root.</en></lang>
  const workspaceRoot = path.resolve(configDirectory, workspaceDirectory);

  return normalizeRequest({
    workspaceRoot,
    outputDirectory: path.resolve(workspaceRoot, outputDirectory),
    inputs: config.inputs,
    options: config.options,
    profileIds: config.profileIds
  });
}

/**
 * @param {string} inputPath <lang><zh-CN>文件名线索；此函数不验证路径或读取文件。</zh-CN><en>Filename hint; this function neither validates the path nor reads a file.</en></lang>
 * @returns {string} <lang><zh-CN>按已有 CEM/template/fragment 后缀匹配，否则 html。</zh-CN><en>Matches existing CEM/template/fragment suffixes, otherwise html.</en></lang>
 */
export function inferHtmDocInputKind(inputPath) {
  // <lang><zh-CN>仅对推断副本统一分隔符和大小写，不修改调用者的原路径。</zh-CN><en>Normalize separators/case only on the inference copy, leaving the caller's path unchanged.</en></lang>
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
      contractVersion: docSourceMap.contractVersion,
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

/**
 * @param {unknown} value <lang><zh-CN>调用方请求。</zh-CN><en>Caller request.</en></lang>
 * @returns {object} <lang><zh-CN>不共享可变数组的规范化运行数据。</zh-CN><en>Normalized runtime data without shared mutable arrays.</en></lang>
 * @throws {TypeError} <lang><zh-CN>拒绝已有声明不支持的类型、路径、重复标识和字段，不回显原值。</zh-CN><en>Rejects types, paths, duplicate identifiers and fields outside existing declarations without echoing values.</en></lang>
 */
function normalizeRequest(value) {
  assertRecord(value, "HTMDoc runner request must be an object.");
  assertAbsoluteDirectory(value.workspaceRoot, "workspaceRoot");
  assertAbsoluteDirectory(value.outputDirectory, "outputDirectory");
  if (!Array.isArray(value.inputs) || value.inputs.length === 0) {
    throw new TypeError("inputs must be a non-empty array.");
  }

  // <lang><zh-CN>逐输入建立新记录，类型错误不能以忽略字段的方式进入执行。</zh-CN><en>Create a fresh record per input; type errors cannot enter execution by silently dropping fields.</en></lang>
  const inputs = value.inputs.map((input, index) => {
    assertRecord(input, `inputs[${index}] must be an object.`);
    assertKnownKeys(input, ["kind", "path", "language"], `inputs[${index}]`);
    // <lang><zh-CN>安全相对定位器和推断 kind 只来自已确认路径，不包含原始私有错误文本。</zh-CN><en>The safe relative locator and inferred kind derive from a checked path without raw private error text.</en></lang>
    const inputPath = normalizeSafeRelativePath(input.path, `inputs[${index}].path`);
    const kind = input.kind === undefined ? inferHtmDocInputKind(inputPath) : input.kind;
    if (!HTMDOC_INPUT_KINDS.includes(kind)) {
      throw new TypeError("Unsupported HTMDoc input kind.");
    }
    if (input.language !== undefined && (typeof input.language !== "string" || input.language.length === 0)) {
      throw new TypeError("HTMDoc input language must be a non-empty string.");
    }
    return {
      kind,
      path: inputPath,
      ...(typeof input.language === "string" ? { language: input.language } : {})
    };
  });

  // <lang><zh-CN>只有省略才采用默认对象，显式 null 仍违反既有 object 声明。</zh-CN><en>Only omission selects the default record; explicit null still violates the existing object declaration.</en></lang>
  const runnerOptions = value.options === undefined ? {} : value.options;
  assertRecord(runnerOptions, "options must be an object.");
  assertKnownKeys(runnerOptions, ["emitDocSourceMap", "sourcesContentPolicy", "writeResultManifest"], "options");
  for (const option of ["emitDocSourceMap", "writeResultManifest"]) {
    if (runnerOptions[option] !== undefined && typeof runnerOptions[option] !== "boolean") {
      throw new TypeError("HTMDoc output options must be booleans.");
    }
  }
  // <lang><zh-CN>显式 null 不能绕过枚举；源码默认 none 不变。</zh-CN><en>Explicit null cannot bypass the enum; source content still defaults to none.</en></lang>
  const sourcesContentPolicy = runnerOptions.sourcesContentPolicy === undefined ? "none" : runnerOptions.sourcesContentPolicy;
  if (!['none', 'reference', 'embed'].includes(sourcesContentPolicy)) {
    throw new TypeError("Unsupported HTMDoc sourcesContentPolicy.");
  }
  // <lang><zh-CN>profileIds 复制且去重条件必须先拒绝，不能静默改变调用者声明。</zh-CN><en>Copy profileIds and reject duplicates instead of silently changing the caller's declaration.</en></lang>
  const profileIds = value.profileIds === undefined ? ["htmdoc"] : value.profileIds;
  if (!Array.isArray(profileIds) || profileIds.length === 0 || profileIds.some((id) => typeof id !== "string" || !SAFE_ID_PATTERN.test(id)) || new Set(profileIds).size !== profileIds.length) {
    throw new TypeError("profileIds must be a non-empty array of unique lower-case identifiers.");
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

/**
 * @param {object} value <lang><zh-CN>已确认的对象。</zh-CN><en>Previously checked record.</en></lang>
 * @param {string[]} allowed <lang><zh-CN>生产者定义的字段名。</zh-CN><en>Producer-defined field names.</en></lang>
 * @param {string} label <lang><zh-CN>生产者定义的边界标签，不能包含用户字段名。</zh-CN><en>Producer-defined boundary label excluding user field names.</en></lang>
 * @returns {void} <lang><zh-CN>字段均受支持时返回。</zh-CN><en>Returns when all fields are supported.</en></lang>
 * @throws {TypeError} <lang><zh-CN>未知字段固定失败，不回显 key。</zh-CN><en>Unknown fields cause a fixed failure without echoing the key.</en></lang>
 */
function assertKnownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new TypeError(`${label} contains an unsupported field.`);
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
