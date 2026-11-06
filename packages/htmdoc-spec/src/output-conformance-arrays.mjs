/** @file @lang zh-CN 包内冻结数组纯数据定义，无导入和运行器副作用。 @lang en Owner-local frozen-array plain-data definitions without imports or runner side effects. */

/**
 * Public-safe violation codes emitted by the HTMDoc output conformance evaluator.
 *
 * 中文：HTMDoc 输出 conformance evaluator 发出的 public-safe violation codes。
 * English: Public-safe violation codes emitted by the HTMDoc output conformance evaluator.
 * @lang zh-CN code 只描述 artifact boundary；绝不回显 source text、absolute path、private sidecar locator 或 caller supplied value。
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
