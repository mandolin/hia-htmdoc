/** @file @lang zh-CN parse5 解析边界和无 I/O 的节点辅助；不执行 HTML。 @lang en parse5 boundary and I/O-free node helpers; never executes HTML. */
import { parse, parseFragment } from "parse5";

/**
 * @param {string} source <lang><zh-CN>显式 HTML 文本。</zh-CN><en>Explicit HTML text.</en></lang>
 * @param {{path?:string,fragment?:boolean}} [options] <lang><zh-CN>相对来源与 fragment 开关，默认 input.html/document。</zh-CN><en>Relative source and fragment switch, defaulting to input.html/document.</en></lang>
 * @returns {object} <lang><zh-CN>parse5 树、相对来源及恢复诊断；隐式节点位置可能缺失。</zh-CN><en>parse5 tree, relative source and recovery diagnostics; implicit node positions may be absent.</en></lang>
 * @throws {TypeError|Error} <lang><zh-CN>不安全来源或 parser 输入失败；路径错误不回显原值。</zh-CN><en>Unsafe source or parser input failure; path errors never echo raw values.</en></lang>
 */
export function parseHtml(source, options = {}) {
  // <lang><zh-CN>先核来源再解析，非法定位器不进入 parser 或诊断对象。</zh-CN><en>Check the source before parsing so unsafe locators enter neither parser nor diagnostics.</en></lang>
  const sourcePath = normalizeSourcePath(options.path ?? "input.html");
  // <lang><zh-CN>每次调用独立收集 parse5 恢复位置，不包含源码正文。</zh-CN><en>Collect parse5 recovery positions per call without source bodies.</en></lang>
  const parseErrors = [];
  // <lang><zh-CN>显式启用一基 UTF-16 位置；onParseError 只保存稳定 code 与位置。</zh-CN><en>Explicitly enable one-based UTF-16 positions; onParseError stores only stable codes/positions.</en></lang>
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

  // <lang><zh-CN>模式只选择 parse5 document/fragment，不遍历 template.content 的额外语义。</zh-CN><en>Mode selects parse5 document/fragment only, adding no template.content traversal semantics.</en></lang>
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
      path: sourcePath
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

/**
 * @param {object} node <lang><zh-CN>parse5 节点。</zh-CN><en>parse5 node.</en></lang>
 * @param {Function} visitor <lang><zh-CN>同步前序回调(node,parent)，异常传播。</zh-CN><en>Synchronous preorder callback(node,parent); exceptions propagate.</en></lang>
 * @param {object|null} [parent] <lang><zh-CN>根父节点默认 null。</zh-CN><en>Root parent defaults to null.</en></lang>
 * @returns {void} <lang><zh-CN>递归 childNodes；不自动遍历 template.content 或防循环。</zh-CN><en>Recurses childNodes without implicit template.content traversal or cycle protection.</en></lang>
 */
export function visitHtmlNodes(node, visitor, parent = null) {
  visitor(node, parent);
  for (const child of node.childNodes ?? []) {
    visitHtmlNodes(child, visitor, node);
  }
}

/** @param {unknown} node <lang><zh-CN>候选节点。</zh-CN><en>Candidate node.</en></lang> @returns {boolean} <lang><zh-CN>存在字符串 tagName 时真；无 I/O。</zh-CN><en>True for a string tagName; no I/O.</en></lang> */
export function isHtmlElementNode(node) {
  return typeof node?.tagName === "string";
}

/** @param {unknown} node <lang><zh-CN>候选节点。</zh-CN><en>Candidate node.</en></lang> @returns {boolean} <lang><zh-CN>仅 #comment 节点为真。</zh-CN><en>True only for a #comment node.</en></lang> */
export function isHtmlCommentNode(node) {
  return node?.nodeName === "#comment";
}

/** @param {object} node <lang><zh-CN>parse5 节点。</zh-CN><en>parse5 node.</en></lang> @returns {object} <lang><zh-CN>新属性记录，缺 attrs 为空；不修改节点。</zh-CN><en>Fresh attribute record, empty without attrs; never mutates the node.</en></lang> */
export function getHtmlNodeAttributes(node) {
  return Object.fromEntries((node.attrs ?? []).map((attr) => [attr.name, attr.value]));
}

/** @param {unknown} node <lang><zh-CN>候选节点。</zh-CN><en>Candidate node.</en></lang> @returns {object|null} <lang><zh-CN>原位置引用或 null，不补造位置。</zh-CN><en>Original location reference or null, without invented positions.</en></lang> */
export function getHtmlNodeLocation(node) {
  return node?.sourceCodeLocation ?? null;
}

/** @param {unknown} sourcePath <lang><zh-CN>显式来源定位器。</zh-CN><en>Explicit source locator.</en></lang> @returns {string} <lang><zh-CN>正斜杠相对路径。</zh-CN><en>Slash-normalized relative path.</en></lang> @throws {TypeError} <lang><zh-CN>不安全或非字符串固定拒绝。</zh-CN><en>Fixed refusal for unsafe/nonstring values.</en></lang> */
function normalizeSourcePath(sourcePath) {
  // <lang><zh-CN>与地图既有相对定位器边界一致；错误不包含用户来源。</zh-CN><en>Match the map's existing relative-locator boundary; errors exclude the caller's source.</en></lang>
  const normalized = typeof sourcePath === "string" ? sourcePath.replaceAll("\\", "/") : "";
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError("Unsafe HTMDoc source path.");
  }
  return normalized;
}

function toRangePosition(line, column) {
  return line && column ? { line, column } : null;
}
