/**
 * @lang zh-CN 源码内容策略闭集；none不嵌入、reference仅引用、embed显式嵌入，列表不授予读取或公开权限。
 * @lang en Closed source-content policies: none omits content, reference links it, and embed explicitly embeds it; the list grants no read or publication permission.
 */
export const HTML_DOC_SOURCE_CONTENT_POLICIES = Object.freeze(["none", "reference", "embed"]);

// <lang><zh-CN>生产者包版本与映射契约版本分别记录；本次只更新逐引用范围契约。</zh-CN><en>The producer package version and map contract version are separate; this change updates per-reference range semantics only.</en></lang>
const HTML_DOC_SOURCE_MAP_VERSION = "1.0.0";

/**
 * @lang zh-CN 已实测的 parse5 HTML 元素范围使用排除终点和 UTF-16 列；未知来源不得借工具名推断。
 * @lang en Proven parse5 HTML element ranges use exclusive ends and UTF-16 columns; unknown origins cannot inherit that claim from a tool name.
 */
const PARSE5_RANGE_CONVENTION = Object.freeze({ endBoundary: "exclusive", columnUnit: "utf16-code-unit" });
/**
 * @lang zh-CN CEM 人工占位及尚未实测的解析分支只表达可追溯线索，不提供精确位置声明。
 * @lang en CEM placeholders and unproven parser branches remain provenance hints without exact-position claims.
 */
const UNKNOWN_RANGE_CONVENTION = Object.freeze({ endBoundary: "unknown", columnUnit: "unknown" });

/**
 * @param {Object} [options] <lang><zh-CN>提取件内的可选链接与源码内容策略。</zh-CN><en>Optional extraction-level link and source-content policy.</en></lang>
 * @param {(string|null)} [options.href=null] <lang><zh-CN>可选映射链接，null 表示未绑定。</zh-CN><en>Optional map link; null means unbound.</en></lang>
 * @param {string} [options.sourcesContentPolicy="none"] <lang><zh-CN>精确 none/reference/embed；其它值拒绝。</zh-CN><en>Exact none/reference/embed; other values are rejected.</en></lang>
 * @returns {{kind:string,href:(string|null),sourcesContentPolicy:string}} <lang><zh-CN>kind 固定为 hia-doc-source-map-ref；不宣称具体映射版本或存在性。</zh-CN><en>Kind is fixed to hia-doc-source-map-ref; claims neither a map version nor its existence.</en></lang>
 * @lang zh-CN `href:null` 表示尚未绑定输出映射；runner 是否产出映射由独立选项决定。
 * @lang en `href:null` means no output map is bound; the runner's separate option determines whether one is emitted.
 */
export function createHtmlDocSourceMapRef(options = {}) {
  return {
    kind: "hia-doc-source-map-ref",
    href: options.href ?? null,
    sourcesContentPolicy: normalizeSourcesContentPolicy(options.sourcesContentPolicy ?? "none")
  };
}

/**
 * @lang zh-CN 精确校验HTML源码内容策略none、reference或embed，返回同一有效策略值。
 * @lang en Validates the exact HTML source-content policies none, reference or embed and returns the same valid policy value.
 * @param {string} policy <lang><zh-CN>精确 none/reference/embed。</zh-CN><en>Exact none/reference/embed.</en></lang> @returns {string} <lang><zh-CN>不改输入的同一合法值。</zh-CN><en>The same valid value without mutation.</en></lang> @throws {TypeError} <lang><zh-CN>未知值固定拒绝，不回显原文。</zh-CN><en>Fixed refusal for unknown values without raw text.</en></lang>
 */
export function normalizeSourcesContentPolicy(policy) {
  if (!HTML_DOC_SOURCE_CONTENT_POLICIES.includes(policy)) {
    throw new TypeError("Unsupported HTMDoc sourcesContent policy.");
  }
  return policy;
}

/**
 * @param {Object} [options] <lang><zh-CN>已生成的 HTMDoc 提取件及安全相对输出路径。</zh-CN><en>Materialized HTMDoc extraction and safe relative output paths.</en></lang>
 * @param {Object.<string,*>} options.extraction <lang><zh-CN>必需的已生成提取件。</zh-CN><en>Required materialized extraction.</en></lang>
 * @param {string} [options.extractionPath="document.htmdoc.json"] <lang><zh-CN>提取件安全相对路径。</zh-CN><en>Safe relative extraction path.</en></lang>
 * @param {string} [options.hiaDocumentPath="document.hia.json"] <lang><zh-CN>HIA 文档安全相对路径。</zh-CN><en>Safe relative HIA document path.</en></lang>
 * @param {string} [options.sourcesContentPolicy] <lang><zh-CN>none/reference/embed；省略时继承提取件策略，再回退 none。</zh-CN><en>none/reference/embed; omission inherits the extraction policy, then falls back to none.</en></lang>
 * @param {string} [options.id] <lang><zh-CN>映射身份；省略时由来源路径派生。</zh-CN><en>Map identity; derived from the source path when omitted.</en></lang>
 * @returns {Record<string,unknown>} <lang><zh-CN>`doc-source-map@1.1.0`，逐个有范围的来源引用声明端点与列单位。</zh-CN><en>A `doc-source-map@1.1.0` with endpoint and column-unit declarations on each ranged source reference.</en></lang>
 * @throws {Error} <lang><zh-CN>提取契约、相对路径或源码内容策略无效时抛出。</zh-CN><en>Throws for an invalid extraction contract, relative path, or source-content policy.</en></lang>
 * @lang zh-CN 已证 parse5 分支声明精确 UTF-16 半开范围；CEM 合成位置、错误恢复及缺列分支明确保持未知，不读取源码或执行主机动作。
 * @lang en Proven parse5 branches declare precise exclusive UTF-16 ranges; CEM placeholders, parser recovery, and missing-column branches stay unknown without reading source or invoking a host.
 */
export function createHtmlDocumentationSourceMap(options = {}) {
  const extraction = options.extraction;
  if (!extraction || extraction.contract !== "hia-htmdoc-extraction" || !["0.1.0-draft", "1.0.0"].includes(extraction.contractVersion)) {
    throw new Error("Expected hia-htmdoc-extraction artifact.");
  }

  const extractionPath = normalizeSafePath(options.extractionPath ?? "document.htmdoc.json");
  const hiaDocumentPath = normalizeSafePath(options.hiaDocumentPath ?? "document.hia.json");
  const sourcePath = normalizeSafePath(extraction.source?.path ?? "input.html");
  const sourceLanguage = extraction.source?.kind === "custom-elements-manifest" ? "json" : "html";
  const sourceId = `source:${sourceLanguage}:${slug(sourcePath)}`;
  const extractionArtifactId = "artifact:htmdoc:extraction";
  const hiaArtifactId = "artifact:hia:document";
  const entryIds = extraction.symbols.map((symbol) => `entry:${slug(symbol.id)}`);
  const sourcesContentPolicy = normalizeSourcesContentPolicy(
    options.sourcesContentPolicy ?? extraction.sourceMap?.sourcesContentPolicy ?? "none"
  );
  // <lang><zh-CN>只接受本提取器且无 parse5 恢复诊断的 HTML 分支为实测精度；CEM 与外来提取件均保守标未知。</zh-CN><en>Only this extractor's HTML branch without parse5 recovery diagnostics receives proven precision; CEM and external extraction artifacts stay unknown.</en></lang>
  const provenParse5 = extraction.source?.kind === "html"
    && ["0.1.0-draft", "1.0.0"].includes(extraction.contractVersion)
    && extraction.producer?.name === "@hia-doc/html-doc-extractor"
    && extraction.metadata?.parser?.name === "parse5"
    && !extraction.diagnostics?.some((diagnostic) => typeof diagnostic?.code === "string" && diagnostic.code.startsWith("HTML_PARSE_"));

  return {
    contract: "doc-source-map",
    contractVersion: "1.1.0",
    id: options.id ?? `docmap:htmdoc:${slug(sourcePath)}`,
    producer: {
      name: "@hia-doc/html-doc-source-map",
      version: HTML_DOC_SOURCE_MAP_VERSION,
      runtime: "node",
      profile: "htmdoc-direct-source"
    },
    pathBases: {
      artifacts: "outputDirectory",
      sources: "workspaceRoot"
    },
    artifacts: [
      {
        id: extractionArtifactId,
        kind: "extraction-artifact",
        path: extractionPath,
        language: "json",
        role: "generated",
        contractRefs: [{
          contract: extraction.contract,
          contractVersion: extraction.contractVersion,
          path: extractionPath
        }]
      },
      {
        id: hiaArtifactId,
        kind: "hia-document",
        path: hiaDocumentPath,
        language: "json",
        role: "generated"
      }
    ],
    sources: [{
      id: sourceId,
      kind: extraction.source?.kind ?? "html",
      path: sourcePath,
      language: sourceLanguage,
      role: "original",
      sourcesContentPolicy
    }],
    sourceMaps: [],
    chains: [{
      id: `chain:htmdoc:${slug(sourcePath)}`,
      stages: [
        {
          from: sourceId,
          to: extractionArtifactId,
          transform: extraction.source?.kind === "custom-elements-manifest" ? "cem-to-htmdoc" : "html-to-htmdoc",
          sourceMap: null,
          linkage: entryIds
        },
        {
          from: extractionArtifactId,
          to: hiaArtifactId,
          transform: "htmdoc-to-hia-core",
          sourceMap: null,
          linkage: entryIds
        }
      ]
    }],
    entries: extraction.symbols.map((symbol, index) => ({
      id: entryIds[index],
      kind: "symbol",
      symbolId: symbol.id,
      symbolKind: symbol.kind,
      ...(symbol.metadata?.tag
        ? { annotation: { tag: symbol.metadata.tag, value: symbol.metadata.value ?? "" } }
        : {}),
      sourceRefs: [{
        sourceId,
        ...(symbol.source?.range ? {
          range: symbol.source.range,
          rangeConvention: provenParse5 && hasCompleteColumns(symbol.source.range)
            ? { ...PARSE5_RANGE_CONVENTION }
            : { ...UNKNOWN_RANGE_CONVENTION }
        } : {}),
        rangeSource: extraction.source?.kind === "custom-elements-manifest" ? "adapter" : "parser",
        confidence: extraction.source?.kind === "custom-elements-manifest" && symbol.source?.range
          ? "low"
          : symbol.source?.range ? "high" : "medium"
      }],
      artifactRefs: [
        {
          artifactId: extractionArtifactId,
          selector: `/symbols/${index}`,
          rangeSource: "adapter",
          confidence: "high"
        },
        {
          artifactId: hiaArtifactId,
          selector: `/symbols/${index}`,
          rangeSource: "adapter",
          confidence: "high"
        }
      ],
      diagnostics: []
    })),
    privacy: {
      sourcesContentPolicy,
      allowAbsolutePaths: false,
      allowUncPaths: false,
      allowPathTraversal: false,
      releaseGate: {
        requireExplicitEmbedOptIn: true,
        failOnUnsafePath: true,
        failOnUnexpectedSourcesContent: true
      }
    },
    diagnostics: []
  };
}

/**
 * @param {unknown} range <lang><zh-CN>上游给出的可选范围。</zh-CN><en>Optional upstream range.</en></lang>
 * @returns {boolean} <lang><zh-CN>起止列均为一基安全整数时为真。</zh-CN><en>True when both columns are one-based safe integers.</en></lang>
 * @lang zh-CN 只有列精度完整的引用才能声明 UTF-16 单位；缺列时保留未知而不补造坐标。
 * @lang en Only column-complete references may claim UTF-16 units; missing columns remain unknown without fabricated positions.
 */
function hasCompleteColumns(range) {
  return Number.isSafeInteger(range?.start?.column) && range.start.column > 0
    && Number.isSafeInteger(range?.end?.column) && range.end.column > 0;
}

function normalizeSafePath(value) {
  const normalized = String(value).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError("Unsafe doc-source-map path.");
  }
  return normalized;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}
