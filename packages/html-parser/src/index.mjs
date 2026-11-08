/** @file @lang zh-CN parse5 解析边界和无 I/O 的节点辅助；不执行 HTML。 @lang en parse5 boundary and I/O-free node helpers; never executes HTML. */
import { parse, parseFragment } from "parse5";

/**
 * @lang zh-CN 使用parse5解析显式HTML文档或片段，返回原生树、受限相对来源及带一基UTF-16位置的恢复诊断。
 * @lang en Parses an explicit HTML document or fragment with parse5, returning its native tree, bounded relative provenance and recovery diagnostics with one-based UTF-16 positions.
 * @param {string} source <lang><zh-CN>显式 HTML 文本。</zh-CN><en>Explicit HTML text.</en></lang>
 * @param {Object} [options] <lang><zh-CN>解析来源与模式配置。</zh-CN><en>Parser source and mode options.</en></lang>
 * @param {string} [options.path="input.html"] <lang><zh-CN>相对来源路径。</zh-CN><en>Relative source path.</en></lang>
 * @param {boolean} [options.fragment=false] <lang><zh-CN>是否解析片段；默认解析完整文档。</zh-CN><en>Whether to parse a fragment; defaults to a complete document.</en></lang>
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
 * @lang zh-CN 同步前序访问当前HTML节点及其childNodes，逐层将实际父节点引用交给回调。
 * @lang en Visits the current HTML node and its childNodes synchronously in preorder, passing actual parent-node references to the callback.
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

/**
 * @lang zh-CN 根据字符串tagName属性判断候选节点是否具备HTML元素节点形状。
 * @lang en Checks whether a candidate has the HTML element-node shape through a string-valued tagName property.
 * @param {unknown} node <lang><zh-CN>候选节点。</zh-CN><en>Candidate node.</en></lang> @returns {boolean} <lang><zh-CN>存在字符串 tagName 时真；无 I/O。</zh-CN><en>True for a string tagName; no I/O.</en></lang>
 */
export function isHtmlElementNode(node) {
  return typeof node?.tagName === "string";
}

/**
 * @lang zh-CN 检查候选节点的nodeName是否精确为#comment，返回注释节点识别结果。
 * @lang en Checks whether a candidate's nodeName is exactly #comment and returns the comment-node recognition result.
 * @param {unknown} node <lang><zh-CN>候选节点。</zh-CN><en>Candidate node.</en></lang> @returns {boolean} <lang><zh-CN>仅 #comment 节点为真。</zh-CN><en>True only for a #comment node.</en></lang>
 */
export function isHtmlCommentNode(node) {
  return node?.nodeName === "#comment";
}

/**
 * @lang zh-CN 将HTML节点attrs中的name/value对收集为新属性记录，重复名称采用最后一项。
 * @lang en Collects name/value pairs from an HTML node's attrs into a fresh attribute record, using the last item for duplicate names.
 * @param {object} node <lang><zh-CN>parse5 节点。</zh-CN><en>parse5 node.</en></lang> @returns {object} <lang><zh-CN>新属性记录，缺 attrs 为空；不修改节点。</zh-CN><en>Fresh attribute record, empty without attrs; never mutates the node.</en></lang>
 */
export function getHtmlNodeAttributes(node) {
  return Object.fromEntries((node.attrs ?? []).map((attr) => [attr.name, attr.value]));
}

/**
 * @lang zh-CN 返回HTML节点原始sourceCodeLocation对象引用，缺少位置时返回null。
 * @lang en Returns an HTML node's original sourceCodeLocation object reference, or null when its location is absent.
 * @param {unknown} node <lang><zh-CN>候选节点。</zh-CN><en>Candidate node.</en></lang> @returns {object|null} <lang><zh-CN>原位置引用或 null，不补造位置。</zh-CN><en>Original location reference or null, without invented positions.</en></lang>
 */
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
