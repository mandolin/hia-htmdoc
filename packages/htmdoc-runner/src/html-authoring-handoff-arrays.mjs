/** @file @lang zh-CN 包内冻结数组纯数据定义，无导入和运行器副作用。 @lang en Owner-local frozen-array plain-data definitions without imports or runner side effects. */

/** @lang zh-CN HTML编写交接拒绝所用的固定可公开诊断码，保持原声明顺序。
 *
 * @lang en Fixed public-safe diagnostic codes for HTML-authoring handoff refusal.
 * <lang><zh-CN>message 只由本模块选择，绝不插入 caller metadata、path、source、target 或 host state。</zh-CN><en>Messages are selected only by this module and never interpolate caller metadata, paths, source, target, or host state.</en>
 */
export const HTML_AUTHORING_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES = Object.freeze([
  "HTMDOC_HTML_HANDOFF_VERSION_UNSUPPORTED",
  "HTMDOC_HTML_HANDOFF_IDENTITY_INVALID",
  "HTMDOC_HTML_HANDOFF_CONFORMANCE_UNACCEPTED",
  "HTMDOC_HTML_HANDOFF_SOURCE_POLICY_DENIED",
  "HTMDOC_HTML_HANDOFF_PRIVATE_DATA_DENIED",
  "HTMDOC_HTML_HANDOFF_MAP_LINKAGE_DENIED",
  "HTMDOC_HTML_HANDOFF_HOST_ACTION_DENIED"
]);
