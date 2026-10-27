/**
 * @file
 * @lang zh-CN 以真实 HTML 解析器与 Custom Elements Manifest 适配器验证源码范围边界和人工占位的区别。
 * @lang en Checks source range boundaries from the real HTML parser and distinguishes synthetic Custom Elements Manifest placeholders.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { cemManifestToHtmlExtraction } from "../packages/cem-adapter/src/index.mjs";
import { extractHtmlDoc } from "../packages/html-doc-extractor/src/index.mjs";
import { createHtmlDocumentationSourceMap } from "../packages/html-doc-source-map/src/index.mjs";

/**
 * 在原始合成源码中计算一基 UTF-16 位置。
 * @param {string} source <lang><zh-CN>未规范化换行的测试源文本。</zh-CN><en>Test source with its original line endings.</en></lang>
 * @param {number} offset <lang><zh-CN>JS 字符串中的 UTF-16 偏移。</zh-CN><en>UTF-16 offset in the JavaScript string.</en></lang>
 * @returns {{line:number,column:number}} <lang><zh-CN>一基行列位置。</zh-CN><en>One-based line and column.</en></lang>
 * @lang zh-CN 此独立基准按 CRLF/CR/LF 分行，按 JS 字符串长度计列，用于核对 parse5 与映射的真实边界。
 * @lang en This independent oracle splits CRLF/CR/LF and counts JS string units to check actual parse5 and map boundaries.
 */
function utf16Position(source, offset) {
  const lines = source.slice(0, offset).split(/\r\n|\r|\n/);
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

test("parse5 HTML comment and element ranges preserve CRLF, UTF-16 and adjacent boundaries", () => {
  // <lang><zh-CN>两个注释与元素只用一次 CRLF 分隔；两个非 BMP 字符分别位于注释和元素中。</zh-CN><en>Only one CRLF separates the comment and element pairs; non-BMP characters occur in both a comment and an element.</en></lang>
  const firstComment = "<!-- @component First 🔥 -->";
  const firstElement = "<x-first>🔥</x-first>";
  const secondComment = "<!-- @component Second -->";
  const secondElement = "<x-second></x-second>";
  const source = `${firstComment}\r\n${firstElement}${secondComment}${secondElement}`;
  const extraction = extractHtmlDoc(source, { path: "fixtures/range.html", fragment: true });
  const map = createHtmlDocumentationSourceMap({ extraction });

  assert.equal(extraction.symbols.length, 2);
  assert.equal(extraction.annotations.length, 2);
  assert.equal(map.entries.length, 2);
  assert.equal(map.contractVersion, "1.1.0");

  // <lang><zh-CN>独立偏移基准核对注释终点、元素起止和下一注释起点，确认相接处不重叠。</zh-CN><en>Independent offsets check comment ends, element bounds and the next comment start, including touching boundaries.</en></lang>
  const firstCommentEnd = firstComment.length;
  const firstElementStart = firstCommentEnd + 2;
  const firstElementEnd = firstElementStart + firstElement.length;
  const secondCommentEnd = firstElementEnd + secondComment.length;
  const secondElementStart = secondCommentEnd;
  const secondElementEnd = secondElementStart + secondElement.length;

  assert.deepEqual(extraction.annotations[0].annotation.range.end, utf16Position(source, firstCommentEnd));
  assert.deepEqual(extraction.symbols[0].source.range.start, utf16Position(source, firstElementStart));
  assert.deepEqual(extraction.symbols[0].source.range.end, utf16Position(source, firstElementEnd));
  assert.deepEqual(extraction.annotations[1].annotation.range.start, utf16Position(source, firstElementEnd));
  assert.deepEqual(extraction.annotations[1].annotation.range.end, utf16Position(source, secondCommentEnd));
  assert.deepEqual(extraction.symbols[1].source.range.start, utf16Position(source, secondElementStart));
  assert.deepEqual(extraction.symbols[1].source.range.end, utf16Position(source, secondElementEnd));

  // <lang><zh-CN>映射直接透传元素范围；结束列比码点列多一，证明非 BMP 在此分支按 UTF-16 计。</zh-CN><en>The map forwards element ranges; its end column exceeds a code-point column by one, confirming UTF-16 on this branch.</en></lang>
  assert.deepEqual(map.entries.map((entry) => entry.sourceRefs[0].range), extraction.symbols.map((symbol) => symbol.source.range));
  assert.ok(map.entries.every((entry) => entry.sourceRefs[0].rangeConvention.endBoundary === "exclusive"));
  assert.ok(map.entries.every((entry) => entry.sourceRefs[0].rangeConvention.columnUnit === "utf16-code-unit"));
  assert.equal(extraction.symbols[0].source.range.end.column, Array.from(firstElement).length + 2);
});

test("empty HTML fragment yields no fabricated source-reference range", () => {
  const extraction = extractHtmlDoc("", { path: "fixtures/empty.html", fragment: true });
  const map = createHtmlDocumentationSourceMap({ extraction });

  assert.equal(extraction.symbols.length, 0);
  assert.deepEqual(map.entries, []);
});

test("multiline template range keeps the parse5 exclusive UTF-16 end", () => {
  // <lang><zh-CN>模板标签与内容跨三行，结束位置必须落在显式闭合标签之后。</zh-CN><en>The template tag and body span three lines; the end must follow the explicit closing tag.</en></lang>
  const comment = "<!-- @template Multiline -->";
  const element = "<template>\r\n  <div title=\"🔥\">body</div>\r\n</template>";
  const source = `${comment}\r\n${element}`;
  const extraction = extractHtmlDoc(source, { path: "fixtures/multiline-template.html", fragment: true });
  const map = createHtmlDocumentationSourceMap({ extraction });
  const startOffset = comment.length + 2;
  const endOffset = startOffset + element.length;

  assert.equal(extraction.symbols.length, 1);
  assert.deepEqual(extraction.symbols[0].source.range, {
    start: utf16Position(source, startOffset),
    end: utf16Position(source, endOffset)
  });
  assert.deepEqual(map.entries[0].sourceRefs[0].range, extraction.symbols[0].source.range);
  assert.deepEqual(map.entries[0].sourceRefs[0].rangeConvention, { endBoundary: "exclusive", columnUnit: "utf16-code-unit" });
});

test("legacy CEM adapter reuses a synthetic 1:1 point for unrelated JSON declarations", () => {
  // <lang><zh-CN>同一非空 manifest 的父子声明并非同一文本位置；相同坐标只能作为旧版占位事实。</zh-CN><en>Parent and child declarations in a nonempty manifest have different text locations; an identical point is only a legacy placeholder fact.</en></lang>
  const manifest = {
    schemaVersion: "1.0.0",
    modules: [{
      path: "src/x-card.js",
      declarations: [{ tagName: "x-card", name: "XCard", attributes: [{ name: "variant" }] }]
    }]
  };
  const extraction = cemManifestToHtmlExtraction(manifest, { path: "fixtures/custom-elements.json" });
  const map = createHtmlDocumentationSourceMap({ extraction });
  const point = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

  assert.equal(extraction.symbols.length, 2);
  assert.deepEqual(extraction.symbols.map((symbol) => symbol.source.range), [point, point]);
  assert.deepEqual(map.entries.map((entry) => entry.sourceRefs[0].range), [point, point]);
  assert.ok(map.entries.every((entry) => entry.sourceRefs[0].rangeSource === "adapter"));
  assert.ok(map.entries.every((entry) => entry.sourceRefs[0].confidence === "low"));
  assert.ok(map.entries.every((entry) => entry.sourceRefs[0].rangeConvention.endBoundary === "unknown"));
  assert.ok(map.entries.every((entry) => entry.sourceRefs[0].rangeConvention.columnUnit === "unknown"));
  assert.equal(map.contractVersion, "1.1.0");
});

test("actual parse5 recovery keeps a source hint without claiming exact range semantics", () => {
  // <lang><zh-CN>缺失属性值使真实 parse5 产出错误恢复诊断；修正对照只改变该属性值。</zh-CN><en>A missing attribute value triggers an actual parse5 recovery diagnostic; the control changes only that value.</en></lang>
  const malformedSource = '<!-- @component Card --><x-card a="b" c=>body</x-card>';
  const correctedSource = '<!-- @component Card --><x-card a="b" c="ok">body</x-card>';
  const options = { path: "fixtures/recovery.html", fragment: true };
  const malformedExtraction = extractHtmlDoc(malformedSource, options);
  const correctedExtraction = extractHtmlDoc(correctedSource, options);
  const malformedMap = createHtmlDocumentationSourceMap({ extraction: malformedExtraction });
  const correctedMap = createHtmlDocumentationSourceMap({ extraction: correctedExtraction });

  // <lang><zh-CN>两个输入都保留符号及来源范围；只有真实恢复诊断把逐引用精度降为未知。</zh-CN><en>Both inputs retain a symbol and source range; only the real recovery diagnostic downgrades per-reference precision to unknown.</en></lang>
  assert.equal(malformedExtraction.symbols.length, 1);
  assert.equal(correctedExtraction.symbols.length, 1);
  assert.ok(malformedExtraction.diagnostics.some((diagnostic) => diagnostic.code === "HTML_PARSE_MISSING_ATTRIBUTE_VALUE"));
  assert.deepEqual(correctedExtraction.diagnostics, []);
  assert.equal(malformedMap.contractVersion, "1.1.0");
  assert.deepEqual(malformedMap.entries[0].sourceRefs[0].range, malformedExtraction.symbols[0].source.range);
  assert.deepEqual(malformedMap.entries[0].sourceRefs[0].rangeConvention,
    { endBoundary: "unknown", columnUnit: "unknown" });
  assert.deepEqual(correctedMap.entries[0].sourceRefs[0].rangeConvention,
    { endBoundary: "exclusive", columnUnit: "utf16-code-unit" });
});

test("unproven HTML recovery and missing columns keep range conventions unknown", () => {
  // <lang><zh-CN>只改变内存中的提取记录，确保已证解析器路径不会给恢复诊断或缺列引用套用精确语义。</zh-CN><en>Mutate only an in-memory extraction record so recovery diagnostics and missing columns cannot inherit proven parser precision.</en></lang>
  const extraction = extractHtmlDoc("<!-- @component Card --><x-card></x-card>", { path: "fixtures/recovery.html", fragment: true });
  const recovered = structuredClone(extraction);
  recovered.diagnostics.push({ code: "HTML_PARSE_SYNTHETIC_RECOVERY", severity: "warning" });
  const missingColumn = structuredClone(extraction);
  delete missingColumn.symbols[0].source.range.end.column;

  assert.deepEqual(createHtmlDocumentationSourceMap({ extraction: recovered }).entries[0].sourceRefs[0].rangeConvention,
    { endBoundary: "unknown", columnUnit: "unknown" });
  assert.deepEqual(createHtmlDocumentationSourceMap({ extraction: missingColumn }).entries[0].sourceRefs[0].rangeConvention,
    { endBoundary: "unknown", columnUnit: "unknown" });
});
