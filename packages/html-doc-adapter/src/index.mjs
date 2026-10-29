import { HTMDOC_EXTRACTION_CONTRACT, validateHtmDocExtraction } from "@hia-doc/htmdoc-spec";

const HIA_CORE_SCHEMA_VERSION = "0.2.0";
const HIA_SOURCE_MODEL = "hia-source";
const HIA_SOURCE_MODEL_VERSION = "0.2.0";

/**
 * @param {object} artifact <lang><zh-CN>普通 JSON 精确旧/新提取件；先校验完整 schema 与 profile 配对。</zh-CN><en>Ordinary-JSON exact legacy/current extraction, checked against its full schema/profile pairing.</en></lang>
 * @param {object} [options] <lang><zh-CN>核心文档 id/title/locale 覆盖。</zh-CN><en>Core-document id/title/locale overrides.</en></lang>
 * @returns {object} <lang><zh-CN>新的核心 0.2.0 文档，不修改提取输入。</zh-CN><en>Fresh core 0.2.0 document without mutating extraction input.</en></lang>
 * @throws {TypeError} <lang><zh-CN>未知身份、无效结构或非 JSON 提取件固定拒绝。</zh-CN><en>Fixed refusal for unknown identities, invalid structure or non-JSON extractions.</en></lang>
 */
export function htmlExtractionToHiaDocument(artifact, options = {}) {
  assertHtmlExtractionArtifact(artifact);
  const title = options.title ?? titleFromPath(artifact.source.path);
  const symbols = artifact.symbols.map((symbol) => mapSymbol(symbol, artifact));
  const defaultLocale = options.defaultLocale ?? artifact.defaultLocale ?? "en";

  return {
    schemaVersion: HIA_CORE_SCHEMA_VERSION,
    id: options.id ?? `htmdoc:${artifact.source.path}`,
    title,
    defaultLocale,
    locales: collectDocumentLocales(options.locales, artifact.locales, symbols, defaultLocale),
    nodes: [
      {
        id: "root",
        kind: "root",
        title,
        symbolIds: symbols.map((symbol) => symbol.id)
      }
    ],
    symbols,
    diagnostics: artifact.diagnostics ?? [],
    metadata: {
      sourceContract: artifact.contract,
      sourceContractVersion: artifact.contractVersion,
      producer: artifact.producer,
      sourceMap: artifact.sourceMap ?? null
    }
  };
}

/**
 * @param {unknown} artifact <lang><zh-CN>候选提取件。</zh-CN><en>Candidate extraction.</en></lang>
 * @returns {void} <lang><zh-CN>精确旧/新 schema 验证通过时返回。</zh-CN><en>Returns when exact legacy/current schema validation succeeds.</en></lang>
 * @throws {TypeError} <lang><zh-CN>失败固定报错，不回显输入/Ajv 详情。</zh-CN><en>Fixed error without echoing input/Ajv details.</en></lang>
 */
export function assertHtmlExtractionArtifact(artifact) {
  if (validateHtmDocExtraction(artifact).length) {
    throw new TypeError("HTMDoc extraction requires an exact supported identity and valid JSON structure.");
  }
  if (!artifact || artifact.contract !== HTMDOC_EXTRACTION_CONTRACT) {
    throw new Error(`Expected ${HTMDOC_EXTRACTION_CONTRACT} artifact.`);
  }
  if (!Array.isArray(artifact.symbols)) {
    throw new Error("HTMDoc extraction artifact must contain symbols array.");
  }
}

function mapSymbol(symbol, artifact) {
  const sourcePath = symbol.source?.path ?? artifact.source.path;
  const range = symbol.source?.range ?? null;
  const fragmentContent = range && artifact.source?.sourcesContent
    ? extractRangeContent(artifact.source.sourcesContent, range)
    : null;
  const mapped = {
    id: symbol.id,
    name: symbol.name,
    kind: symbol.kind,
    parentId: symbol.parentId,
    summary: symbol.i18n?.fields?.description?.defaultText ?? symbol.summary,
    source: {
      model: HIA_SOURCE_MODEL,
      modelVersion: HIA_SOURCE_MODEL_VERSION,
      mode: "link",
      definedIn: {
        kind: "defined-in",
        relativePath: sourcePath,
        language: "html",
        position: range?.start ?? { line: 1, column: 1 },
        range: range ?? undefined
      },
      fragments: range && fragmentContent
        ? [
            {
              kind: "source-fragment",
              id: `${symbol.id}:source`,
              relativePath: sourcePath,
              language: "html",
              range,
              content: fragmentContent,
              rangeSource: "parser",
              confidence: "high",
              origin: {
                contract: artifact.contract,
                annotation: symbol.annotation ?? null
              }
            }
          ]
        : []
    },
    diagnostics: symbol.diagnostics ?? [],
    metadata: {
      htmdoc: {
        annotation: symbol.annotation ?? null,
        ...symbol.metadata
      }
    }
  };
  if (symbol.i18n) {
    mapped.i18n = symbol.i18n;
  }
  return mapped;
}

function collectDocumentLocales(optionLocales, artifactLocales, symbols, defaultLocale) {
  const locales = [
    defaultLocale,
    ...(Array.isArray(optionLocales) ? optionLocales : []),
    ...(Array.isArray(artifactLocales) ? artifactLocales : [])
  ];
  for (const symbol of symbols) {
    locales.push(...(Array.isArray(symbol.i18n?.locales) ? symbol.i18n.locales : []));
  }
  return [...new Set(locales.map((locale) => normalizeLocale(locale)).filter(Boolean))];
}

function normalizeLocale(value) {
  const locale = String(value ?? "").trim().replace(/_/g, "-");
  return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ? locale : "";
}

function titleFromPath(sourcePath) {
  return sourcePath.split("/").at(-1) || "HTMDoc Document";
}

/**
 * @param {string} source <lang><zh-CN>已获显式 embed 许可的原文本。</zh-CN><en>Original text under explicit embed permission.</en></lang>
 * @param {object} range <lang><zh-CN>parse5 一基 UTF-16 半开范围。</zh-CN><en>parse5 one-based UTF-16 exclusive range.</en></lang>
 * @returns {string|null} <lang><zh-CN>精确原文本，不 trim/归一化换行；无效或空范围为 null。</zh-CN><en>Exact original text without trim/newline normalization; invalid or empty ranges return null.</en></lang>
 */
function extractRangeContent(source, range) {
  // <lang><zh-CN>分别记录每行正文起止偏移，使 CRLF 宽度保留而列仍按 UTF-16 计。</zh-CN><en>Track each line's body offsets separately, preserving CRLF width while columns count UTF-16 units.</en></lang>
  const text = String(source);
  const starts = [0];
  const ends = [];
  for (const newline of text.matchAll(/\r\n|\r|\n/g)) {
    ends.push(newline.index);
    starts.push(newline.index + newline[0].length);
  }
  ends.push(text.length);
  // <lang><zh-CN>不把越界坐标钳制到相邻文本，缺列/缺终点不能伪造片段。</zh-CN><en>Never clamp invalid coordinates into adjacent text; missing columns/ends cannot fabricate fragments.</en></lang>
  const offsets = [];
  for (const position of [range?.start, range?.end]) {
    if (!Number.isSafeInteger(position?.line) || !Number.isSafeInteger(position?.column) || position.line < 1 || position.line > starts.length || position.column < 1) return null;
    const line = position.line - 1;
    if (position.column - 1 > ends[line] - starts[line]) return null;
    offsets.push(starts[line] + position.column - 1);
  }
  if (offsets[1] < offsets[0]) return null;
  return text.slice(offsets[0], offsets[1]) || null;
}
