/** @file @lang zh-CN 包内冻结数组纯数据定义，无导入和运行器副作用。 @lang en Owner-local frozen-array plain-data definitions without imports or runner side effects. */

/**
 * @lang zh-CN HTML文档输出一致性评估器发出的可公开违规码，仅描述工件边界，诊断内容排除源码正文、绝对路径、私有侧车定位器及调用方值。
 * @lang en Public-safe violation codes emitted by the HTML documentation output conformance evaluator. Codes describe artifact boundaries and never echo source text, absolute paths, private sidecar locators or caller-supplied values.
 */
export const HTMDOC_OUTPUT_CONFORMANCE_CODES = Object.freeze([
  "HTMDOC_OUTPUT_CONFORMANCE_INPUT_INVALID",
  "HTMDOC_OUTPUT_CONFORMANCE_EXTRACTION_INVALID",
  "HTMDOC_OUTPUT_CONFORMANCE_DOCUMENT_INVALID",
  "HTMDOC_OUTPUT_CONFORMANCE_RELATION_INVALID",
  "HTMDOC_OUTPUT_CONFORMANCE_PROVENANCE_INVALID",
  "HTMDOC_OUTPUT_CONFORMANCE_SOURCE_POLICY_INVALID",
  "HTMDOC_OUTPUT_CONFORMANCE_EMBED_UNAUTHORIZED",
  "HTMDOC_OUTPUT_CONFORMANCE_SIDECAR_BOUNDARY_INVALID",
  "HTMDOC_OUTPUT_CONFORMANCE_PRODUCER_RESULT_INVALID"
]);
