/** @file @lang zh-CN 包内冻结数组纯数据定义，无导入和运行器副作用。 @lang en Owner-local frozen-array plain-data definitions without imports or runner side effects. */

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
