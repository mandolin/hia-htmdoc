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

export function extractHtmlDoc(source, options = {}) {
  const sourcePath = normalizeSourcePath(options.path ?? "input.html");
  const parsed = parseHtml(source, { path: sourcePath, fragment: options.fragment ?? false });
  const pairs = collectAttachedCommentPairs(parsed.document, source);
  const symbols = [];
  const annotations = [];
  const diagnostics = [...parsed.diagnostics];
  const usedIds = new Set();

  for (const pair of pairs) {
    const block = parseHtmlDocComment(pair.comment.data ?? "");
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
      const symbol = createSymbolFromAnnotation(primary, target, pair.comment, block, usedIds);
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
      symbols.push(createSymbolFromAnnotation(annotation, target, pair.comment, block, usedIds, parentId));
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

  return {
    contract: HTMDOC_EXTRACTION_CONTRACT,
    contractVersion: HTMDOC_EXTRACTION_CONTRACT_VERSION,
    producer: {
      name: "@hia-doc/html-doc-extractor",
      version: "0.0.0"
    },
    profile: {
      name: "htmdoc",
      version: HTMDOC_PROFILE_VERSION
    },
    source: sourceRecord,
    symbols,
    annotations,
    diagnostics,
    sourceMap: createHtmlDocSourceMapRef({ sourcesContentPolicy }),
    metadata: {
      parser: parsed.parser,
      fragment: parsed.parser.mode === "fragment"
    }
  };
}

export function parseHtmlDocComment(rawComment) {
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

  const descriptionTag = annotations.find((annotation) => annotation.tag === "description");
  return {
    annotations,
    summary: descriptionTag?.value || prose.join(" ").trim() || null
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

function createSymbolFromAnnotation(annotation, target, comment, block, usedIds, parentId = null) {
  const kind = getHtmlDocSymbolKind(annotation.tag);
  const name = getAnnotationName(annotation, target);
  const id = allocateId(`html:${annotation.tag}:${slug(name)}`, usedIds);
  const symbol = {
    id,
    kind,
    name,
    summary: annotation.tag === "component" || annotation.tag === "element" || annotation.tag === "template"
      ? block.summary ?? undefined
      : getAnnotationDescription(annotation),
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
  return symbol;
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

function normalizeSourcePath(sourcePath) {
  const normalized = String(sourcePath).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe HTMDoc source path: ${sourcePath}`);
  }
  return normalized;
}
