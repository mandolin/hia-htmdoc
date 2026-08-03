const SOURCE_COMMENT_PROJECTION_CONTRACT = "documentation-source-comment-projection";
const SOURCE_COMMENT_PROJECTION_VERSION = "0.1.0-draft";
const HTMDOC_EXTRACTION_CONTRACT = "hia-htmdoc-extraction";
const HTMDOC_EXTRACTION_VERSION = "0.1.0-draft";
const DOC_SOURCE_MAP_CONTRACT = "doc-source-map";
const DOC_SOURCE_MAP_VERSION = "0.1.0-draft";
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/**
 * Create a neutral W-P96 projection request from already-materialized HTMDoc metadata.
 *
 * 中文：从已经 materialized 的 HTMDoc metadata 创建中性 W-P96 projection request。
 * English: Create a neutral W-P96 projection request from already-materialized HTMDoc metadata.
 *
 * @param {unknown} value <lang><zh-CN>只含 extraction、ordinary doc-source-map、logical identity 与 locale policy 的 closed request。</zh-CN><en>Closed request containing only an extraction, ordinary doc-source-map, logical identity, and locale policy.</en></lang>
 * @returns {{contract:"documentation-source-comment-projection",contractVersion:"0.1.0-draft",projectionId:string,source:{documentId:string,symbolId:string,sourceId:string,docSourceMapEntryId:string},requestedLocale:string,defaultLocale:string,fallbackLocales:string[],contentPolicy:"none"|"explicit-projected-text",comments:Array<{commentId:"comment.description",kind:"documentation",order:0,localizedText:Record<string,string>,range?:{start:{line:number,column:number},end:{line:number,column:number}}}>}} <lang><zh-CN>可直接交给 `@hia-doc/core` pure evaluator 的 body-bounded request。</zh-CN><en>Body-bounded request ready for the `@hia-doc/core` pure evaluator.</en></lang>
 * @throws {TypeError} <lang><zh-CN>contract、identity、locale、map linkage 或 structured text 不符合冻结边界时抛出固定错误。</zh-CN><en>Throws a fixed error when contract, identity, locale, map linkage, or structured text violates the frozen boundary.</en></lang>
 * @lang zh-CN 函数不读取文件、不运行 parser/core、不执行表达式，也不访问 target、host 或 network。
 * @lang en The function reads no file, runs no parser/core, executes no expression, and accesses no target, host, or network.
 */
export function createHtmlAuthoringSourceCommentProjectionRequest(value) {
  const request = requireRecord(value, "HTML-authoring source-comment integration requires one request object.");
  requireExactKeys(request, ["contentPolicy", "documentId", "docSourceMap", "extraction", "fallbackLocales", "projectionId", "requestedLocale", "symbolId"]);
  const extraction = requireRecord(request.extraction, "HTML-authoring source-comment integration requires one HTMDoc extraction.");
  const docSourceMap = requireRecord(request.docSourceMap, "HTML-authoring source-comment integration requires one doc-source-map.");

  // <lang><zh-CN>两个输入 contract 必须 exact-match；adapter 不猜测 future draft compatibility。</zh-CN><en>Both input contracts must match exactly; the adapter never guesses future draft compatibility.</en></lang>
  if (extraction.contract !== HTMDOC_EXTRACTION_CONTRACT || extraction.contractVersion !== HTMDOC_EXTRACTION_VERSION || !Array.isArray(extraction.symbols)) {
    throw new TypeError("HTML-authoring source-comment integration requires hia-htmdoc-extraction@0.1.0-draft.");
  }
  if (docSourceMap.contract !== DOC_SOURCE_MAP_CONTRACT || docSourceMap.contractVersion !== DOC_SOURCE_MAP_VERSION
    || !Array.isArray(docSourceMap.entries) || !Array.isArray(docSourceMap.sources)) {
    throw new TypeError("HTML-authoring source-comment integration requires doc-source-map@0.1.0-draft.");
  }
  if (docSourceMap.privacy?.sourcesContentPolicy !== "none"
    || docSourceMap.sources.some((source) => source?.sourcesContentPolicy !== "none" || Object.hasOwn(source ?? {}, "sourcesContent"))) {
    throw new TypeError("HTML-authoring source-comment integration requires a none-only ordinary doc-source-map.");
  }

  const documentId = requireStableId(request.documentId, "documentId");
  const symbolId = requireStableId(request.symbolId, "symbolId");
  const projectionId = requireStableId(request.projectionId, "projectionId");
  const requestedLocale = requireCanonicalLocale(request.requestedLocale, "requestedLocale");
  const fallbackLocales = normalizeFallbackLocales(request.fallbackLocales);
  const contentPolicy = request.contentPolicy === "none" || request.contentPolicy === "explicit-projected-text"
    ? request.contentPolicy
    : undefined;
  if (!contentPolicy) {
    throw new TypeError("HTML-authoring source-comment integration requires an explicit supported contentPolicy.");
  }

  // <lang><zh-CN>symbol 与 map entry 都按显式 symbolId 精确选择；entry id 不由 symbol id 的字符串形态推导。</zh-CN><en>The symbol and map entry are selected by explicit symbolId; the entry ID is never derived from the symbol ID's string form.</en></lang>
  const symbols = extraction.symbols.filter((symbol) => symbol?.id === symbolId);
  const mapEntries = docSourceMap.entries.filter((entry) => entry?.symbolId === symbolId);
  if (symbols.length !== 1 || mapEntries.length !== 1) {
    throw new TypeError("HTML-authoring source-comment integration requires one unique symbol and one unique map entry.");
  }
  const symbol = requireRecord(symbols[0], "HTML-authoring source-comment integration requires one structured symbol.");
  const mapEntry = requireRecord(mapEntries[0], "HTML-authoring source-comment integration requires one structured map entry.");
  const docSourceMapEntryId = requireStableId(mapEntry.id, "docSourceMapEntryId");
  if (!Array.isArray(mapEntry.sourceRefs) || mapEntry.sourceRefs.length !== 1) {
    throw new TypeError("HTML-authoring source-comment integration requires one explicit source reference.");
  }
  const sourceRef = requireRecord(mapEntry.sourceRefs[0], "HTML-authoring source-comment integration requires one source reference object.");
  const sourceId = requireStableId(sourceRef.sourceId, "sourceId");
  if (!docSourceMap.sources.some((source) => source?.id === sourceId && source?.sourcesContentPolicy === "none")) {
    throw new TypeError("HTML-authoring source-comment integration source reference must resolve inside the none-only map.");
  }

  const localized = readStructuredDescription(symbol, extraction);
  const range = normalizeAnnotationRange(symbol.annotation?.range);

  return {
    comments: [{
      commentId: "comment.description",
      kind: "documentation",
      localizedText: localized.localizedText,
      order: 0,
      ...(range ? { range } : {})
    }],
    contentPolicy,
    contract: SOURCE_COMMENT_PROJECTION_CONTRACT,
    contractVersion: SOURCE_COMMENT_PROJECTION_VERSION,
    defaultLocale: localized.defaultLocale,
    fallbackLocales,
    projectionId,
    requestedLocale,
    source: { docSourceMapEntryId, documentId, sourceId, symbolId }
  };
}

/**
 * Read field-level i18n without exposing parser-private annotations or raw comments.
 *
 * 中文：读取 field-level i18n，不暴露 parser-private annotation 或 raw comment。
 * English: Read field-level i18n without exposing parser-private annotations or raw comments.
 *
 * @param {Record<string,unknown>} symbol <lang><zh-CN>已选中的 HTMDoc symbol。</zh-CN><en>Selected HTMDoc symbol.</en></lang>
 * @param {Record<string,unknown>} extraction <lang><zh-CN>用于 default locale fallback 的 extraction metadata。</zh-CN><en>Extraction metadata used for default-locale fallback.</en></lang>
 * @returns {{defaultLocale:string,localizedText:Record<string,string>}} <lang><zh-CN>canonical locale 到 bounded plain text 的映射。</zh-CN><en>Mapping from canonical locales to bounded plain text.</en></lang>
 */
function readStructuredDescription(symbol, extraction) {
  const description = symbol.i18n?.fields?.description;
  const candidateDefaultLocale = description?.defaultLocale ?? symbol.i18n?.defaultLocale ?? extraction.defaultLocale;
  const defaultLocale = requireCanonicalLocale(candidateDefaultLocale, "defaultLocale");
  const source = isRecord(description?.localizedText)
    ? description.localizedText
    : { [defaultLocale]: symbol.summary };
  const localizedText = {};
  for (const [locale, text] of Object.entries(source)) {
    const canonicalLocale = requireCanonicalLocale(locale, "localizedText locale");
    if (typeof text !== "string" || text.length === 0 || text.length > 4096) {
      throw new TypeError("HTML-authoring source-comment integration requires bounded non-empty projected plain text.");
    }
    localizedText[canonicalLocale] = text;
  }
  if (Object.keys(localizedText).length === 0 || !localizedText[defaultLocale]) {
    throw new TypeError("HTML-authoring source-comment integration requires default-locale structured text.");
  }
  return { defaultLocale, localizedText };
}

/**
 * Convert HTMDoc 1-based annotation columns to W-P96 0-based projection columns.
 *
 * 中文：把 HTMDoc 1-based annotation column 转换为 W-P96 0-based projection column。
 * English: Convert HTMDoc 1-based annotation columns to W-P96 0-based projection columns.
 *
 * @param {unknown} value <lang><zh-CN>可选 HTMDoc annotation range。</zh-CN><en>Optional HTMDoc annotation range.</en></lang>
 * @returns {{start:{line:number,column:number},end:{line:number,column:number}}|undefined} <lang><zh-CN>中性 projection range；缺失时不伪造。</zh-CN><en>Neutral projection range, omitted rather than fabricated when absent.</en></lang>
 */
function normalizeAnnotationRange(value) {
  if (!isRecord(value) || !isRecord(value.start) || !isRecord(value.end)) return undefined;
  if (![value.start.line, value.start.column, value.end.line, value.end.column].every(Number.isInteger)
    || value.start.line < 1 || value.start.column < 1 || value.end.line < 1 || value.end.column < 1) {
    throw new TypeError("HTML-authoring source-comment integration received an invalid annotation range.");
  }
  return {
    start: { line: value.start.line, column: value.start.column - 1 },
    end: { line: value.end.line, column: value.end.column - 1 }
  };
}

/** @lang zh-CN 规范化 caller-explicit fallback locale array。 @lang en Normalizes the caller-explicit fallback locale array. */
function normalizeFallbackLocales(value) {
  if (!Array.isArray(value) || value.length > 16) {
    throw new TypeError("HTML-authoring source-comment integration requires a bounded fallbackLocales array.");
  }
  const locales = value.map((locale) => requireCanonicalLocale(locale, "fallback locale"));
  if (new Set(locales).size !== locales.length) {
    throw new TypeError("HTML-authoring source-comment integration requires unique fallback locales.");
  }
  return locales;
}

/** @lang zh-CN 验证并返回 canonical BCP 47 tag。 @lang en Validates and returns a canonical BCP 47 tag. */
function requireCanonicalLocale(value, label) {
  if (typeof value !== "string" || value.includes("_")) {
    throw new TypeError(`HTML-authoring source-comment integration requires a canonical ${label}.`);
  }
  try {
    const canonical = Intl.getCanonicalLocales(value)[0];
    if (!canonical || canonical !== value) throw new Error("not canonical");
    return canonical;
  } catch {
    throw new TypeError(`HTML-authoring source-comment integration requires a canonical ${label}.`);
  }
}

/** @lang zh-CN 验证并返回 logical stable identity。 @lang en Validates and returns a logical stable identity. */
function requireStableId(value, label) {
  if (typeof value !== "string" || value.length > 256 || !STABLE_ID_PATTERN.test(value)) {
    throw new TypeError(`HTML-authoring source-comment integration requires a stable ${label}.`);
  }
  return value;
}

/** @lang zh-CN 验证 plain record。 @lang en Validates a plain record. */
function requireRecord(value, message) {
  if (!isRecord(value)) throw new TypeError(message);
  return value;
}

/** @lang zh-CN 检查 plain record。 @lang en Checks a plain record. */
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** @lang zh-CN 拒绝 unknown request fields。 @lang en Rejects unknown request fields. */
function requireExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError("HTML-authoring source-comment integration request contains unsupported fields.");
  }
}
