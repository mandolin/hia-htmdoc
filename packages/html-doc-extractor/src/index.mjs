import {
  HTMDOC_EXTRACTION_CONTRACT,
  HTMDOC_EXTRACTION_CONTRACT_VERSION,
  HTMDOC_PROFILE_VERSION,
  getHtmlDocSymbolKind,
  isHtmlDocTag
} from "@hia-doc/htmdoc-spec";
import { createHtmlDocSourceMapRef, normalizeSourcesContentPolicy } from "@hia-doc/html-doc-source-map";
import {
  getHtmlNodeAttributes,
  getHtmlNodeLocation,
  isHtmlCommentNode,
  isHtmlElementNode,
  parseHtml
} from "@hia-doc/html-parser";

const PRIMARY_TAGS = ["component", "element", "template"];
const DEFAULT_LOCALE = "en";
const HIA_TEXT_I18N_MODEL = "hia-text-i18n";
const HIA_TEXT_I18N_MODEL_VERSION = "0.2.0";
// <lang><zh-CN>提取产物 provenance 的版本必须与公开候选 manifest 同步，不能保留 skeleton 版本。</zh-CN><en>The extraction provenance version must match the public candidate manifest and cannot retain the skeleton version.</en></lang>
const HTML_DOC_EXTRACTOR_VERSION = "1.0.0";

/**
 * @param {string} source <lang><zh-CN>调用方显式提供的 HTML 文本。</zh-CN><en>Explicit caller-provided HTML text.</en></lang>
 * @param {object} [options] <lang><zh-CN>相对 path、fragment、默认语言与内容策略，默认不嵌源码。</zh-CN><en>Relative path, fragment mode, default locale and content policy, defaulting to no embedded source.</en></lang>
 * @returns {object} <lang><zh-CN>提取/profile 1.0.0 普通 JSON；可选 undefined 字段省略。</zh-CN><en>Ordinary-JSON extraction/profile 1.0.0 with optional undefined properties omitted.</en></lang>
 * @throws {Error} <lang><zh-CN>不支持的路径/策略或 parser 输入错误。</zh-CN><en>Unsupported paths/policies or parser input failures.</en></lang>
 * @lang zh-CN 只做已确认的保守注释绑定，不读取文件/网络或生成可见页面。
 * @lang en Applies the confirmed conservative comment attachment only, without file/network reads or visible-page generation.
 */
export function extractHtmlDoc(source, options = {}) {
  const sourcePath = normalizeSourcePath(options.path ?? "input.html");
  const defaultLocale = normalizeLocale(options.defaultLocale) || DEFAULT_LOCALE;
  const parsed = parseHtml(source, { path: sourcePath, fragment: options.fragment ?? false });
  const pairs = collectAttachedCommentPairs(parsed.document, source);
  const symbols = [];
  const annotations = [];
  const diagnostics = [...parsed.diagnostics];
  const usedIds = new Set();

  for (const pair of pairs) {
    const block = parseHtmlDocComment(pair.comment.data ?? "", { defaultLocale });
    if (block.annotations.length === 0) {
      continue;
    }

    const target = createTargetInfo(pair.element, sourcePath);
    annotations.push({
      tags: block.annotations,
      source: target.source,
      annotation: toAnnotationRange(pair.comment)
    });

    const primary = block.annotations.find((annotation) => PRIMARY_TAGS.includes(annotation.tag));
    let parentId = null;
    if (primary) {
      const symbol = createSymbolFromAnnotation(primary, target, pair.comment, block, usedIds, null, defaultLocale);
      symbols.push(symbol);
      parentId = symbol.id;
    }

    for (const annotation of block.annotations) {
      if (PRIMARY_TAGS.includes(annotation.tag) || annotation.tag === "description" || annotation.tag === "lang") {
        continue;
      }
      const kind = getHtmlDocSymbolKind(annotation.tag);
      if (!kind) {
        diagnostics.push(createDiagnostic("HTMDOC_UNKNOWN_TAG", `Unknown HTMDoc annotation tag: @${annotation.tag}`, "warning", target.source, { tag: annotation.tag }));
        continue;
      }
      symbols.push(createSymbolFromAnnotation(annotation, target, pair.comment, block, usedIds, parentId, defaultLocale));
    }
  }

  const sourcesContentPolicy = normalizeSourcesContentPolicy(options.sourcesContentPolicy ?? "none");
  const sourceRecord = {
    kind: "html",
    path: sourcePath
  };
  if (sourcesContentPolicy === "embed") {
    sourceRecord.sourcesContent = source;
  }

  // <lang><zh-CN>返回 wire JSON 形状，省略既有可选 undefined，避免读者需要处理非 JSON 中间值。</zh-CN><en>Return the wire JSON shape, omitting existing optional undefined values so readers need no non-JSON intermediates.</en></lang>
  return JSON.parse(JSON.stringify({
    contract: HTMDOC_EXTRACTION_CONTRACT,
    contractVersion: HTMDOC_EXTRACTION_CONTRACT_VERSION,
    producer: {
      name: "@hia-doc/html-doc-extractor",
      version: HTML_DOC_EXTRACTOR_VERSION
    },
    profile: {
      name: "htmdoc",
      version: HTMDOC_PROFILE_VERSION
    },
    defaultLocale,
    locales: collectLocales([defaultLocale, ...symbols.flatMap((symbol) => symbol.i18n?.locales ?? [])]),
    source: sourceRecord,
    symbols,
    annotations,
    diagnostics,
    sourceMap: createHtmlDocSourceMapRef({ sourcesContentPolicy }),
    metadata: {
      parser: parsed.parser,
      fragment: parsed.parser.mode === "fragment"
    }
  }));
}

/**
 * @param {string} rawComment <lang><zh-CN>已取出的注释正文；不做 DOM 绑定。</zh-CN><en>Extracted comment body without DOM attachment.</en></lang>
 * @param {{defaultLocale?:string}} [options] <lang><zh-CN>默认语言，合法化失败回退 en。</zh-CN><en>Default locale, falling back to en when invalid.</en></lang>
 * @returns {object} <lang><zh-CN>annotations、summary 和可选字段级 i18n；保留未知标签供调用者诊断。</zh-CN><en>Annotations, summary and optional field-level i18n; unknown tags remain for caller diagnostics.</en></lang>
 */
export function parseHtmlDocComment(rawComment, options = {}) {
  const lines = String(rawComment)
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, "").trim());

  const annotations = [];
  const prose = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    const match = /^@([A-Za-z][\w-]*)(?:\s+(.*))?$/.exec(line);
    if (!match) {
      prose.push(line);
      continue;
    }
    const tag = normalizeTag(match[1]);
    const value = (match[2] ?? "").trim();
    annotations.push({
      tag,
      value,
      known: isHtmlDocTag(tag)
    });
  }

  const defaultLocale = normalizeLocale(options.defaultLocale) || DEFAULT_LOCALE;
  const descriptionTag = annotations.find((annotation) => annotation.tag === "description");
  const summary = descriptionTag?.value || prose.join(" ").trim() || null;
  return {
    annotations,
    summary,
    i18n: createDescriptionI18n(summary, annotations, defaultLocale, "htmdoc.comment")
  };
}

function collectAttachedCommentPairs(node, source, pairs = []) {
  const children = node.childNodes ?? [];
  let pendingComment = null;

  for (const child of children) {
    if (isHtmlCommentNode(child)) {
      pendingComment = child;
      continue;
    }

    if (isIgnorableTextNode(child)) {
      continue;
    }

    if (isHtmlElementNode(child)) {
      if (pendingComment && isImmediatelyBefore(pendingComment, child, source)) {
        pairs.push({ comment: pendingComment, element: child });
      }
      pendingComment = null;
      collectAttachedCommentPairs(child, source, pairs);
      continue;
    }

    pendingComment = null;
    collectAttachedCommentPairs(child, source, pairs);
  }

  return pairs;
}

function isIgnorableTextNode(node) {
  return node?.nodeName === "#text" && /^\s*$/.test(node.value ?? "");
}

function isImmediatelyBefore(comment, element, source) {
  const commentLocation = getHtmlNodeLocation(comment);
  const elementLocation = getHtmlNodeLocation(element);
  if (!commentLocation || !elementLocation) {
    return false;
  }
  const between = source.slice(commentLocation.endOffset, elementLocation.startOffset);
  return /^\s*$/.test(between);
}

function createTargetInfo(element, sourcePath) {
  const location = getHtmlNodeLocation(element);
  const attrs = getHtmlNodeAttributes(element);
  return {
    tagName: element.tagName,
    attrs,
    source: {
      path: sourcePath,
      range: toRange(location)
    }
  };
}

function createSymbolFromAnnotation(annotation, target, comment, block, usedIds, parentId = null, defaultLocale = DEFAULT_LOCALE) {
  const kind = getHtmlDocSymbolKind(annotation.tag);
  const name = getAnnotationName(annotation, target);
  const id = allocateId(`html:${annotation.tag}:${slug(name)}`, usedIds);
  const summary = annotation.tag === "component" || annotation.tag === "element" || annotation.tag === "template"
    ? block.summary ?? undefined
    : getAnnotationDescription(annotation);
  const i18n = annotation.tag === "component" || annotation.tag === "element" || annotation.tag === "template"
    ? createDescriptionI18n(summary, block.annotations, defaultLocale, "htmdoc.comment")
    : createDescriptionI18n(summary, [], defaultLocale, `htmdoc.${annotation.tag}`);
  const symbol = {
    id,
    kind,
    name,
    summary: i18n?.fields.description?.defaultText ?? summary,
    source: target.source,
    annotation: toAnnotationRange(comment),
    metadata: {
      tag: annotation.tag,
      value: annotation.value,
      target: {
        tagName: target.tagName,
        attrs: target.attrs
      }
    }
  };
  if (parentId) {
    symbol.parentId = parentId;
  }
  if (i18n) {
    symbol.i18n = i18n;
  }
  return symbol;
}

// 中文：把 HTMDoc 的 `@lang` 与 inline `<lang>/<l>` 规整成 HIA field-level i18n。
// English: Normalizes HTMDoc `@lang` and inline `<lang>/<l>` into HIA field-level i18n.
function createDescriptionI18n(defaultText, annotations, defaultLocale, source) {
  const blocks = collectLangBlocks(annotations, "description", source);
  const segments = parseInlineSegments(defaultText, "description");
  if (blocks.length === 0 && segments.length === 0) {
    return null;
  }

  const field = createTextField({
    fieldPath: "description",
    kind: "text",
    defaultLocale,
    defaultText,
    blocks,
    segments,
    source
  });

  return {
    enabled: true,
    model: HIA_TEXT_I18N_MODEL,
    modelVersion: HIA_TEXT_I18N_MODEL_VERSION,
    defaultLocale,
    locales: collectLocales([defaultLocale, ...Object.keys(field.localizedText)]),
    fields: {
      description: field
    }
  };
}

function collectLangBlocks(annotations, fieldPath, source) {
  return annotations
    .filter((annotation) => annotation.tag === "lang")
    .map((annotation) => parseLangBlock(annotation.value, fieldPath, source))
    .filter(Boolean);
}

function parseLangBlock(value, fieldPath, source) {
  const match = /^(\S+)(?:\s+([\s\S]+))?$/.exec(String(value ?? "").trim());
  const locale = normalizeLocale(match?.[1]);
  const text = compactWhitespace(match?.[2] ?? "");
  if (!locale || !text) {
    return null;
  }
  return {
    kind: "lang-block",
    locale,
    fieldPath,
    text,
    source,
    rangeInComment: null
  };
}

function createTextField(options) {
  const localizedText = {};
  const locales = collectLocales([
    options.defaultLocale,
    ...options.blocks.map((block) => block.locale),
    ...options.segments.flatMap((segment) => Object.keys(segment.localized))
  ]);

  for (const locale of locales) {
    const block = options.blocks.find((item) => item.locale === locale);
    localizedText[locale] = block?.text ?? renderInlineText(options.defaultText, options.segments, locale, options.defaultLocale);
  }

  const defaultText = localizedText[options.defaultLocale] || firstLocalizedText(localizedText) || compactWhitespace(options.defaultText);

  return {
    fieldPath: options.fieldPath,
    kind: options.kind,
    defaultLocale: options.defaultLocale,
    defaultText,
    source: options.source,
    localizedText,
    ...(options.blocks.length > 0 ? { blocks: options.blocks } : {}),
    ...(options.segments.length > 0 ? { segments: options.segments } : {}),
    resolutions: Object.fromEntries(Object.keys(localizedText).map((locale) => [
      locale,
      {
        requestedLocale: locale,
        resolvedLocale: locale,
        fallbackChain: fallbackChain(locale, options.defaultLocale),
        usedFallback: false,
        missing: false,
        sourceKind: options.blocks.some((block) => block.locale === locale) ? "lang-block" : "default-text",
        sourceLocale: locale,
        source: options.source
      }
    ])),
    missingLocales: []
  };
}

function parseInlineSegments(text, fieldPath) {
  const sourceText = String(text ?? "");
  const segments = [];
  const pattern = /<(lang|l)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = pattern.exec(sourceText))) {
    const localized = parseInlineLocalizedValues(match[3]);
    if (Object.keys(localized).length === 0) {
      continue;
    }
    const attributes = parseAttributes(match[2]);
    segments.push({
      kind: "lang-inline",
      id: `${fieldPath}.${segments.length}`,
      key: attributes.key ?? "",
      path: attributes.path ?? "",
      fieldPath,
      raw: match[0],
      localized,
      rangeInField: {
        start: match.index,
        end: match.index + match[0].length
      }
    });
  }
  return segments;
}

function parseInlineLocalizedValues(innerText) {
  const localized = {};
  const pattern = /<([A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = pattern.exec(innerText || ""))) {
    const locale = normalizeLocale(match[1]);
    const text = compactWhitespace(match[2]);
    if (locale && text) {
      localized[locale] = text;
    }
  }
  return localized;
}

function renderInlineText(text, segments, locale, defaultLocale) {
  let rendered = compactWhitespace(text);
  for (const segment of segments) {
    rendered = rendered.replace(segment.raw, resolveInlineLocalizedText(segment.localized, locale, defaultLocale));
  }
  return rendered;
}

function resolveInlineLocalizedText(localized, locale, defaultLocale) {
  return localized[locale]
    ?? localized[getParentLocale(locale)]
    ?? localized[defaultLocale]
    ?? firstLocalizedText(localized)
    ?? "";
}

function parseAttributes(rawAttributes) {
  const attributes = {};
  const pattern = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(rawAttributes || ""))) {
    attributes[match[1]] = match[2] || match[3] || "";
  }
  return attributes;
}

function getAnnotationName(annotation, target) {
  const [first] = annotation.value.split(/\s+/).filter(Boolean);
  if (first) {
    return first;
  }
  if (annotation.tag === "component") {
    return target.attrs["data-component"] || target.attrs.id || target.tagName;
  }
  if (annotation.tag === "element" || annotation.tag === "template") {
    return target.tagName;
  }
  return annotation.tag;
}

function getAnnotationDescription(annotation) {
  const [, ...rest] = annotation.value.split(/\s+/).filter(Boolean);
  return rest.join(" ") || undefined;
}

function toAnnotationRange(comment) {
  return {
    range: toRange(getHtmlNodeLocation(comment))
  };
}

function toRange(location) {
  if (!location) {
    return null;
  }
  return {
    start: {
      line: location.startLine,
      column: location.startCol
    },
    end: {
      line: location.endLine,
      column: location.endCol
    }
  };
}

function createDiagnostic(code, message, severity, source, data = {}) {
  return {
    code,
    message,
    severity,
    path: source.path,
    data: {
      ...data,
      source
    }
  };
}

function normalizeTag(tag) {
  return tag.toLowerCase().replace(/-/g, "");
}

function allocateId(baseId, usedIds) {
  let id = baseId;
  let index = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }
  usedIds.add(id);
  return id;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}

function collectLocales(values) {
  return [...new Set(values.map((value) => normalizeLocale(value)).filter(Boolean))];
}

function normalizeLocale(value) {
  const locale = String(value ?? "").trim().replace(/_/g, "-");
  return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ? locale : "";
}

function getParentLocale(locale) {
  return String(locale).split("-")[0] || locale;
}

function fallbackChain(locale, defaultLocale) {
  const chain = collectLocales([locale, getParentLocale(locale), defaultLocale]);
  return chain.length > 0 ? chain : [DEFAULT_LOCALE];
}

function firstLocalizedText(localizedText) {
  return Object.values(localizedText).find((text) => typeof text === "string" && text.length > 0) ?? "";
}

function compactWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/** @param {unknown} sourcePath <lang><zh-CN>显式来源定位器。</zh-CN><en>Explicit source locator.</en></lang> @returns {string} <lang><zh-CN>不含 URI/父级穿越的相对路径。</zh-CN><en>Relative path without URI/parent traversal.</en></lang> @throws {TypeError} <lang><zh-CN>固定安全失败，不回显原值。</zh-CN><en>Fixed safe failure without echoing raw values.</en></lang> */
function normalizeSourcePath(sourcePath) {
  // <lang><zh-CN>来源仅限相对字符串，URI/盘符相对位置也不能进入公开工件。</zh-CN><en>Sources are relative strings only; URIs and drive-relative locators cannot enter public artifacts.</en></lang>
  const normalized = typeof sourcePath === "string" ? sourcePath.replaceAll("\\", "/") : "";
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError("Unsafe HTMDoc source path.");
  }
  return normalized;
}
