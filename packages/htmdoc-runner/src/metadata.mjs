/** @file @lang zh-CN 运行器纯元数据，含版本及冻结输入/输出种类。 @lang en Pure runner metadata containing its version and frozen input/output kinds. */

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

/**
 * HTMDoc runner public package version.
 *
 * @lang zh-CN 写入 producer descriptor/result 的精确实现版本；它与 draft contract version 是不同维度。
 * @lang en Exact implementation version written to producer descriptors/results; it is independent from draft contract versions.
 */
export const HTMDOC_RUNNER_VERSION = "1.0.0";
