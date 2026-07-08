import { parse, parseFragment } from "parse5";

export function parseHtml(source, options = {}) {
  const parseErrors = [];
  const parserOptions = {
    sourceCodeLocationInfo: true,
    onParseError(error) {
      parseErrors.push({
        code: error.code,
        start: toRangePosition(error.startLine, error.startCol),
        end: toRangePosition(error.endLine, error.endCol)
      });
    }
  };

  const document = options.fragment
    ? parseFragment(source, parserOptions)
    : parse(source, parserOptions);

  return {
    kind: "parse5-html",
    parser: {
      name: "parse5",
      mode: options.fragment ? "fragment" : "document"
    },
    source: {
      path: normalizeSourcePath(options.path ?? "input.html")
    },
    document,
    diagnostics: parseErrors.map((error) => ({
      code: `HTML_PARSE_${error.code.toUpperCase().replaceAll("-", "_")}`,
      message: `HTML parse warning: ${error.code}`,
      severity: "warning",
      data: error
    }))
  };
}

export function visitHtmlNodes(node, visitor, parent = null) {
  visitor(node, parent);
  for (const child of node.childNodes ?? []) {
    visitHtmlNodes(child, visitor, node);
  }
}

export function isHtmlElementNode(node) {
  return typeof node?.tagName === "string";
}

export function isHtmlCommentNode(node) {
  return node?.nodeName === "#comment";
}

export function getHtmlNodeAttributes(node) {
  return Object.fromEntries((node.attrs ?? []).map((attr) => [attr.name, attr.value]));
}

export function getHtmlNodeLocation(node) {
  return node?.sourceCodeLocation ?? null;
}

function normalizeSourcePath(sourcePath) {
  const normalized = String(sourcePath).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe HTMDoc source path: ${sourcePath}`);
  }
  return normalized;
}

function toRangePosition(line, column) {
  return line && column ? { line, column } : null;
}
