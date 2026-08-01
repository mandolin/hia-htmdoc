/**
 * HTML-authoring documentation handoff 评估器。
 *
 * 本 owner-local draft 只评估调用方提供的 metadata projection；绝不发现项目、读取 source/artifact/
 * source-map body、打开 desktop host、执行 target command 或访问 network service。
 *
 * @lang en HTML-authoring documentation handoff evaluator. This owner-local draft evaluates a caller-provided metadata projection only. It never discovers a project, reads source/artifact/source-map bodies, opens a desktop host, executes a target command, or contacts a network service.
 */

/**
 * 便携 HTML-authoring review handoff 的 owner-local contract identifier。
 *
 * @lang en Owner-local contract identifier for a portable HTML-authoring review handoff.
 */
export const HTML_AUTHORING_DOCUMENTATION_HANDOFF_CONTRACT = "html-authoring-documentation-handoff";

/**
 * owner-local handoff result 的初始冻结 draft version。
 *
 * @lang en Initial frozen draft version of the owner-local handoff result.
 */
export const HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION = "0.1.0-draft";

/**
 * HTML-authoring handoff refusal 的固定 public-safe diagnostic codes。
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

/** The explicit input contract avoids treating arbitrary evidence JSON as a handoff request. / 显式 input contract 避免把 arbitrary evidence JSON 当成 handoff request。 */
const REQUEST_CONTRACT = "html-authoring-documentation-handoff-request";
/** The request version is exact; this draft does not infer compatibility from a SemVer range. / request version 必须 exact；本 draft 不从 SemVer range 推断兼容性。 */
const REQUEST_VERSION = "0.1.0-draft";
/** Existing HTMDoc conformance remains the only accepted owner-local predecessor. / 既有 HTMDoc conformance 仍是唯一接受的 owner-local predecessor。 */
const CONFORMANCE_CONTRACT = "htmdoc-output-conformance";
/** Existing conformance version is fixed so a future result shape is not silently accepted. / 既有 conformance version 固定，避免 future result shape 被静默接受。 */
const CONFORMANCE_VERSION = "0.1.0-draft";
/** Ordinary documentation map identity remains a linkage declaration, never a transport container. / ordinary documentation map identity 保持 linkage declaration，绝不是 transport container。 */
const DOC_SOURCE_MAP_CONTRACT = "doc-source-map";
/** Current ordinary map version used by the HTMDoc P1 output boundary. / HTMDoc P1 output boundary 使用的 current ordinary map version。 */
const DOC_SOURCE_MAP_VERSION = "0.1.0-draft";
/** The report is deliberately target-neutral and cannot accept a target identifier. / report 特意保持 target-neutral，不能接受 target identifier。 */
const PRODUCER_ID = "htmdoc";
/** Output identity uses a compact logical namespace and excludes paths, URLs, whitespace, and opaque hashes. / output identity 使用 compact logical namespace，并排除 path、URL、whitespace 和 opaque hash。 */
const OUTPUT_ID_PATTERN = /^htmdoc-output:[a-z0-9][a-z0-9._-]{0,127}$/u;
/** Stable entry identities have no slash so they cannot become a relative filesystem locator. / stable entry identity 不含 slash，因而不能成为 relative filesystem locator。 */
const ENTRY_ID_PATTERN = /^[a-z][a-z0-9._:-]{0,159}$/u;
/** Bounded versions are labels only and are never resolved through a package registry. / bounded versions 只是 label，绝不通过 package registry resolve。 */
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/u;
/** The locale assertion accepts a compact BCP-47-like tag or an explicit no-assertion value. / locale assertion 接受 compact BCP-47-like tag 或 explicit no-assertion value。 */
const LOCALE_PATTERN = /^(?:not-asserted|[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$/u;
/** Ordered diagnostics make equivalent input produce byte-stable JSON. / ordered diagnostics 使等价 input 生成 byte-stable JSON。 */
const DIAGNOSTIC_ORDER = Object.freeze([...HTML_AUTHORING_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES]);
/** Refusal reason order is fixed so callers cannot infer validation traversal from output order. / refusal reason order 固定，caller 不能从 output order 推断 validation traversal。 */
const REFUSAL_REASON_ORDER = Object.freeze([
  "version",
  "identity",
  "conformance",
  "source-policy",
  "private-data",
  "map-linkage",
  "host-action"
]);

/**
 * 构建一个确定性的 metadata-only handoff report 或 fail-closed refusal。
 *
 * @param {unknown} request <lang><zh-CN>caller-provided 的显式 metadata request；不得包含 target/source/path/body。</zh-CN><en>Caller-provided explicit metadata request; it must not contain target/source/path/body data.</en></lang>
 * @returns {object} <lang><zh-CN>accepted metadata report，或不反射 caller input 的 refused report。</zh-CN><en>An accepted metadata report, or a refused report that reflects no caller input.</en></lang>
 * @lang en Builds a deterministic metadata-only handoff report or fail-closed refusal. This pure evaluator reads and writes no files, executes no command, and calls no Tauri, Obsidian, or network API.
 */
export function createHtmlAuthoringDocumentationHandoff(request) {
  // <lang><zh-CN>primitive/array request 退化为 empty record；所有 failure 仍只返回 fixed diagnostics。</zh-CN><en>A primitive or array request degrades to an empty record; every failure still returns only fixed diagnostics.</en></lang>
  const candidate = isRecord(request) ? request : {};
  // <lang><zh-CN>Map 以 code 去重，避免一份 malformed request 放大为不稳定的 diagnostic list。</zh-CN><en>The Map deduplicates by code, preventing one malformed request from expanding into an unstable diagnostic list.</en></lang>
  const diagnostics = new Map();
  // <lang><zh-CN>root key guard 最先运行；未知字段可能夹带 source/path/body，必须先切断 reflection surface。</zh-CN><en>The root key guard runs first; unknown fields may carry source/path/body and must be cut off before the reflection surface.</en></lang>
  if (!hasExactKeys(candidate, ["conformance", "contract", "contractVersion", "docSourceMap", "output", "permissions", "privacy", "producer"])) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_PRIVATE_DATA_DENIED");
  }
  // <lang><zh-CN>request contract/version 是 compatibility gate；错误值不会进入 refusal output。</zh-CN><en>Request contract/version are the compatibility gate; invalid values never enter refusal output.</en></lang>
  if (candidate.contract !== REQUEST_CONTRACT || candidate.contractVersion !== REQUEST_VERSION) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_VERSION_UNSUPPORTED");
  }
  // <lang><zh-CN>每个 section 独立 sanitize，令一项 failure 不会迫使其他原始 caller fields 穿透 output。</zh-CN><en>Each section sanitizes independently so a failure in one never forces other raw caller fields through the output.</en></lang>
  const output = normalizeOutput(candidate.output, diagnostics);
  const producer = normalizeProducer(candidate.producer, diagnostics);
  const conformance = normalizeConformance(candidate.conformance, diagnostics);
  const docSourceMap = normalizeDocSourceMap(candidate.docSourceMap, diagnostics);
  validatePrivacy(candidate.privacy, diagnostics);
  validatePermissions(candidate.permissions, diagnostics);

  // <lang><zh-CN>任何 diagnostic 都 fail closed；refusal 不含 output id、entry、locale、producer version 或任何 caller projection。</zh-CN><en>Any diagnostic fails closed; the refusal contains no output id, entry, locale, producer version, or caller projection.</en></lang>
  if (diagnostics.size > 0 || !output || !producer || !conformance || !docSourceMap) {
    return createRefusal(diagnostics);
  }

  // <lang><zh-CN>accepted output 只由 safe normalized scalar/array 组成；不使用 object spread，防止未来字段无审查泄漏。</zh-CN><en>The accepted output uses only safe normalized scalars/arrays; no object spread is used, preventing unreviewed future fields from leaking.</en></lang>
  return freezeReport({
    contract: HTML_AUTHORING_DOCUMENTATION_HANDOFF_CONTRACT,
    contractVersion: HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION,
    status: "accepted",
    output,
    producer,
    conformance,
    provenance: {
      kind: "metadata-only-owner-projection",
      ordinaryMapLinkage: "explicit-reference-only",
      ordinaryMapCarriesHandoffModel: false
    },
    compatibility: {
      sourcePolicy: "none",
      nativeUi: "not-applicable",
      localeChangesCanonicalIdentity: false
    },
    evidenceSemantics: {
      resolution: "report-contract-validated",
      confidence: "caller-provided-unverified",
      provenance: "metadata-only-derived-projection"
    },
    privacy: createPrivacyBoundary(),
    permissions: createPermissionBoundary(),
    adoption: {
      targetAdoptionClaimed: false
    },
    diagnostics: []
  });
}

/**
 * 验证并投影 canonical output identity、stable entry identifiers 与 locale metadata。
 *
 * @lang en Validates and projects canonical output identity, stable entry identifiers, and locale metadata.
 *
 * @param {unknown} value <lang><zh-CN>caller-provided output metadata。</zh-CN><en>Caller-provided output metadata.</en></lang>
 * @param {Map<string, object>} diagnostics <lang><zh-CN>固定 diagnostic accumulator。</zh-CN><en>Fixed diagnostic accumulator.</en></lang>
 * @returns {{id:string,stableEntryIds:string[],entryCount:number,locale:{value:string,changesCanonicalIdentity:false}}|null} <lang><zh-CN>safe output projection；失败时为 null。</zh-CN><en>Safe output projection; null on failure.</en></lang>
 */
function normalizeOutput(value, diagnostics) {
  // <lang><zh-CN>exact-key guard 禁止 target/source/path 或 display/UI metadata 偷渡到 report input。</zh-CN><en>The exact-key guard prevents target/source/path or display/UI metadata from slipping into report input.</en></lang>
  if (!isRecord(value) || !hasExactKeys(value, ["id", "locale", "stableEntryIds"])) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_IDENTITY_INVALID");
    return null;
  }
  // <lang><zh-CN>entry IDs 必须至少一个、唯一且无 slash；这既提供审计 continuity，也避免把 locator 误作 identity。</zh-CN><en>Entry IDs must be non-empty, unique, and slash-free; this provides audit continuity while preventing locators from masquerading as identity.</en></lang>
  const entryIds = Array.isArray(value.stableEntryIds) && value.stableEntryIds.every((item) => typeof item === "string" && ENTRY_ID_PATTERN.test(item))
    ? [...value.stableEntryIds]
    : [];
  const locale = typeof value.locale === "string" && LOCALE_PATTERN.test(value.locale) ? value.locale : null;
  if (typeof value.id !== "string" || !OUTPUT_ID_PATTERN.test(value.id) || entryIds.length === 0 || new Set(entryIds).size !== entryIds.length || !locale) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_IDENTITY_INVALID");
    return null;
  }
  return Object.freeze({
    id: value.id,
    stableEntryIds: Object.freeze(entryIds),
    entryCount: entryIds.length,
    locale: Object.freeze({ value: locale, changesCanonicalIdentity: false })
  });
}

/**
 * 验证并投影 producer success metadata，且不接受 target identity。
 *
 * @lang en Validates and projects producer success metadata without accepting a target identity.
 *
 * @param {unknown} value <lang><zh-CN>caller-provided producer metadata。</zh-CN><en>Caller-provided producer metadata.</en></lang>
 * @param {Map<string, object>} diagnostics <lang><zh-CN>固定 diagnostic accumulator。</zh-CN><en>Fixed diagnostic accumulator.</en></lang>
 * @returns {{id:string,version:string,status:"success"}|null} <lang><zh-CN>safe producer projection；失败时为 null。</zh-CN><en>Safe producer projection; null on failure.</en></lang>
 */
function normalizeProducer(value, diagnostics) {
  // <lang><zh-CN>producer 只能证明 HTMDoc 自己的 output status；它不是 host/target execution 证明。</zh-CN><en>The producer can prove only HTMDoc's own output status; it is not proof of host or target execution.</en></lang>
  if (!isRecord(value) || !hasExactKeys(value, ["id", "status", "version"]) || value.id !== PRODUCER_ID || typeof value.version !== "string" || !VERSION_PATTERN.test(value.version) || value.status !== "success") {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_CONFORMANCE_UNACCEPTED");
    return null;
  }
  return Object.freeze({ id: PRODUCER_ID, version: value.version, status: "success" });
}

/**
 * 将既有 conformance summary 验证为 predecessor，且不复制其 violation bodies。
 *
 * @lang en Validates the existing conformance summary as a predecessor, without copying its violation bodies.
 *
 * @param {unknown} value <lang><zh-CN>caller-provided conformance summary。</zh-CN><en>Caller-provided conformance summary.</en></lang>
 * @param {Map<string, object>} diagnostics <lang><zh-CN>固定 diagnostic accumulator。</zh-CN><en>Fixed diagnostic accumulator.</en></lang>
 * @returns {{contract:string,contractVersion:string,conformant:true}|null} <lang><zh-CN>safe conformance projection；失败时为 null。</zh-CN><en>Safe conformance projection; null on failure.</en></lang>
 */
function normalizeConformance(value, diagnostics) {
  // <lang><zh-CN>未知 conformance field 可包含 artifact/source detail；exact key set 保持 report metadata-only。</zh-CN><en>An unknown conformance field could contain artifact/source detail; the exact key set keeps the report metadata-only.</en></lang>
  if (!isRecord(value) || !hasExactKeys(value, ["conformant", "contract", "contractVersion", "violations"])) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_PRIVATE_DATA_DENIED");
    return null;
  }
  if (value.contract !== CONFORMANCE_CONTRACT || value.contractVersion !== CONFORMANCE_VERSION) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_VERSION_UNSUPPORTED");
  }
  if (value.conformant !== true || !Array.isArray(value.violations) || value.violations.length !== 0) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_CONFORMANCE_UNACCEPTED");
  }
  if (value.contract !== CONFORMANCE_CONTRACT || value.contractVersion !== CONFORMANCE_VERSION || value.conformant !== true || !Array.isArray(value.violations) || value.violations.length !== 0) {
    return null;
  }
  return Object.freeze({ contract: CONFORMANCE_CONTRACT, contractVersion: CONFORMANCE_VERSION, conformant: true });
}

/**
 * 验证 ordinary-map linkage declaration 及其 none-only source policy。
 *
 * @lang en Validates the ordinary-map linkage declaration and its none-only source policy.
 *
 * @param {unknown} value <lang><zh-CN>caller-provided ordinary-map metadata declaration。</zh-CN><en>Caller-provided ordinary-map metadata declaration.</en></lang>
 * @param {Map<string, object>} diagnostics <lang><zh-CN>固定 diagnostic accumulator。</zh-CN><en>Fixed diagnostic accumulator.</en></lang>
 * @returns {{contract:string,contractVersion:string,linkage:"explicit-reference-only",carriesHandoffModel:false,sourcesContentPolicy:"none"}|null} <lang><zh-CN>safe map projection；失败时为 null。</zh-CN><en>Safe map projection; null on failure.</en></lang>
 */
function normalizeDocSourceMap(value, diagnostics) {
  // <lang><zh-CN>map declaration 不接受 entries/artifacts/sources body；这些内容属于 W-P70 conformance input，不属于 handoff transport。</zh-CN><en>The map declaration accepts no entries/artifacts/sources body; those belong to W-P70 conformance input, not handoff transport.</en></lang>
  if (!isRecord(value) || !hasExactKeys(value, ["carriesHandoffModel", "contract", "contractVersion", "linkage", "sourcesContentPolicy"])) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_PRIVATE_DATA_DENIED");
    return null;
  }
  if (value.contract !== DOC_SOURCE_MAP_CONTRACT || value.contractVersion !== DOC_SOURCE_MAP_VERSION) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_VERSION_UNSUPPORTED");
  }
  if (value.sourcesContentPolicy !== "none") {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_SOURCE_POLICY_DENIED");
  }
  if (value.linkage !== "explicit-reference-only" || value.carriesHandoffModel !== false) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_MAP_LINKAGE_DENIED");
  }
  if (value.contract !== DOC_SOURCE_MAP_CONTRACT || value.contractVersion !== DOC_SOURCE_MAP_VERSION || value.sourcesContentPolicy !== "none" || value.linkage !== "explicit-reference-only" || value.carriesHandoffModel !== false) {
    return null;
  }
  return Object.freeze({
    contract: DOC_SOURCE_MAP_CONTRACT,
    contractVersion: DOC_SOURCE_MAP_VERSION,
    linkage: "explicit-reference-only",
    carriesHandoffModel: false,
    sourcesContentPolicy: "none"
  });
}

/**
 * 要求 input privacy declaration 拒绝每个 body、locator、credential 与 state field。
 *
 * @lang en Requires the input privacy declaration to deny every body, locator, credential, and state field.
 *
 * @param {unknown} value <lang><zh-CN>caller-provided privacy declaration。</zh-CN><en>Caller-provided privacy declaration.</en></lang>
 * @param {Map<string, object>} diagnostics <lang><zh-CN>固定 diagnostic accumulator。</zh-CN><en>Fixed diagnostic accumulator.</en></lang>
 * @returns {void} <lang><zh-CN>违反时追加 fixed diagnostic。</zh-CN><en>Appends a fixed diagnostic when violated.</en></lang>
 */
function validatePrivacy(value, diagnostics) {
  // <lang><zh-CN>fail-closed boolean record 防止 omission 被误解为没有 source/path/private data。</zh-CN><en>The fail-closed boolean record prevents omission from being misread as absence of source/path/private data.</en></lang>
  const expectedKeys = ["absolutePathSerialized", "credentialSerialized", "mapBodySerialized", "rawLocatorSerialized", "sidecarBodySerialized", "sourceBodySerialized", "workingStateSerialized"];
  if (!isRecord(value) || !hasExactKeys(value, expectedKeys) || Object.values(value).some((item) => item !== false)) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_PRIVATE_DATA_DENIED");
  }
}

/**
 * 要求每个 target/host/network/publish capability declaration 都保持 false。
 *
 * @lang en Requires every target/host/network/publish capability declaration to remain false.
 *
 * @param {unknown} value <lang><zh-CN>caller-provided permission declaration。</zh-CN><en>Caller-provided permission declaration.</en></lang>
 * @param {Map<string, object>} diagnostics <lang><zh-CN>固定 diagnostic accumulator。</zh-CN><en>Fixed diagnostic accumulator.</en></lang>
 * @returns {void} <lang><zh-CN>违反时追加 fixed diagnostic。</zh-CN><en>Appends a fixed diagnostic when violated.</en></lang>
 */
function validatePermissions(value, diagnostics) {
  // <lang><zh-CN>这份 record 同时锁住 Tauri、Obsidian 与 generic target action；没有逐 host fallback。</zh-CN><en>This record locks Tauri, Obsidian, and generic target action together; there is no per-host fallback.</en></lang>
  const expectedKeys = ["fetchEnabled", "networkAccessed", "packagePublished", "sourceReaderImplemented", "targetAdoptionClaimed", "targetCommandExecuted", "targetRepositoryRead", "targetRepositoryWrite", "targetRuntimeOpened", "tauriIpcIntegration", "obsidianVaultIntegration"];
  if (!isRecord(value) || !hasExactKeys(value, expectedKeys) || Object.values(value).some((item) => item !== false)) {
    addDiagnostic(diagnostics, "HTMDOC_HTML_HANDOFF_HOST_ACTION_DENIED");
  }
}

/**
 * 创建一份只报告 fixed diagnostics、但不反射 caller-controlled field 的 refusal。
 *
 * @lang en Creates a refusal that reports fixed diagnostics but reflects no caller-controlled field.
 *
 * @param {Map<string, object>} diagnostics <lang><zh-CN>按 code 去重的 diagnostic map。</zh-CN><en>Diagnostic map deduplicated by code.</en></lang>
 * @returns {object} <lang><zh-CN>fail-closed public-safe refusal report。</zh-CN><en>Fail-closed public-safe refusal report.</en></lang>
 */
function createRefusal(diagnostics) {
  // <lang><zh-CN>排序只使用 frozen code order；caller object/diagnostic value 从不影响 output order 或 content。</zh-CN><en>Sorting uses only the frozen code order; no caller object or diagnostic value affects output order or content.</en></lang>
  const sortedDiagnostics = DIAGNOSTIC_ORDER.filter((code) => diagnostics.has(code)).map((code) => diagnostics.get(code));
  const reasonFamilies = REFUSAL_REASON_ORDER.filter((reason) => sortedDiagnostics.some((diagnostic) => diagnostic.reason === reason));
  return freezeReport({
    contract: HTML_AUTHORING_DOCUMENTATION_HANDOFF_CONTRACT,
    contractVersion: HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION,
    status: "refused",
    refusal: {
      inputReflected: false,
      outputIdentityReflected: false,
      entryIdentityReflected: false,
      producerVersionReflected: false,
      reasonFamilies
    },
    privacy: createPrivacyBoundary(),
    permissions: createPermissionBoundary(),
    adoption: {
      targetAdoptionClaimed: false
    },
    diagnostics: sortedDiagnostics.map(({ code, message }) => ({ code, message }))
  });
}

/**
 * 最多追加一次 frozen diagnostic。
 *
 * @lang en Appends one frozen diagnostic at most once.
 *
 * @param {Map<string, object>} diagnostics <lang><zh-CN>diagnostic map。</zh-CN><en>Diagnostic map.</en></lang>
 * @param {string} code <lang><zh-CN>已冻结 diagnostic code。</zh-CN><en>Frozen diagnostic code.</en></lang>
 * @returns {void} <lang><zh-CN>无返回；未知 code 不会被接受。</zh-CN><en>No return; an unknown code is never accepted.</en></lang>
 */
function addDiagnostic(diagnostics, code) {
  // <lang><zh-CN>definition 与 reason 均是 module-owned constants，故 message 不会泄漏 untrusted input。</zh-CN><en>The definition and reason are module-owned constants, so the message cannot leak untrusted input.</en></lang>
  const definition = DIAGNOSTIC_DEFINITIONS[code];
  if (definition && !diagnostics.has(code)) {
    diagnostics.set(code, { code, ...definition });
  }
}

/**
 * 检查 record 的 exact key set，且不复制 unknown properties。
 *
 * @lang en Checks a record's exact key set without copying unknown properties.
 *
 * @param {unknown} value <lang><zh-CN>候选 record。</zh-CN><en>Candidate record.</en></lang>
 * @param {string[]} expectedKeys <lang><zh-CN>未排序的 expected key list。</zh-CN><en>Unsorted expected key list.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否恰好匹配。</zh-CN><en>Whether the key set matches exactly.</en></lang>
 */
function hasExactKeys(value, expectedKeys) {
  if (!isRecord(value)) {
    return false;
  }
  // <lang><zh-CN>key sort 只处理 object own property names；不会访问 getter、nested object 或 external locator。</zh-CN><en>Key sorting handles object own property names only; it never accesses getters, nested objects, or external locators.</en></lang>
  const actualKeys = Object.keys(value).sort((left, right) => left.localeCompare(right, "en"));
  const sortedExpected = [...expectedKeys].sort((left, right) => left.localeCompare(right, "en"));
  return actualKeys.length === sortedExpected.length && actualKeys.every((key, index) => key === sortedExpected[index]);
}

/**
 * 在检查 fixed fields 前识别 non-null、non-array record。
 *
 * @lang en Identifies a non-null, non-array record before inspecting fixed fields.
 *
 * @param {unknown} value <lang><zh-CN>候选 value。</zh-CN><en>Candidate value.</en></lang>
 * @returns {value is Record<string, unknown>} <lang><zh-CN>是否为 record。</zh-CN><en>Whether the value is a record.</en></lang>
 */
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * 返回不变的 metadata-only privacy boundary。
 *
 * @lang en Returns the invariant metadata-only privacy boundary.
 *
 * @returns {Readonly<Record<string, false>>} <lang><zh-CN>全 false privacy record。</zh-CN><en>All-false privacy record.</en></lang>
 */
function createPrivacyBoundary() {
  // <lang><zh-CN>每次创建新 frozen record，避免 caller 通过 shared object mutation 改变 future report。</zh-CN><en>Create a new frozen record per call, preventing caller mutation of a shared object from changing a future report.</en></lang>
  return Object.freeze({
    sourceBodySerialized: false,
    mapBodySerialized: false,
    sidecarBodySerialized: false,
    absolutePathSerialized: false,
    rawLocatorSerialized: false,
    credentialSerialized: false,
    workingStateSerialized: false
  });
}

/**
 * 返回不变的 no-target/no-host/no-network permission boundary。
 *
 * @lang en Returns the invariant no-target/no-host/no-network permission boundary.
 *
 * @returns {Readonly<Record<string, false>>} <lang><zh-CN>全 false permission record。</zh-CN><en>All-false permission record.</en></lang>
 */
function createPermissionBoundary() {
  // <lang><zh-CN>包含 host-specific flags 以避免 generic no-write 被错误地解释为允许 IPC/Vault integration。</zh-CN><en>Host-specific flags prevent generic no-write from being misread as permission for IPC/Vault integration.</en></lang>
  return Object.freeze({
    targetRepositoryRead: false,
    targetRepositoryWrite: false,
    targetCommandExecuted: false,
    targetRuntimeOpened: false,
    tauriIpcIntegration: false,
    obsidianVaultIntegration: false,
    sourceReaderImplemented: false,
    fetchEnabled: false,
    networkAccessed: false,
    packagePublished: false
  });
}

/**
 * 只冻结由本模块分配的 report top-level container。
 *
 * @lang en Freezes only the top-level report container allocated by this module; selected nested values are separately frozen where needed.
 *
 * @param {object} report <lang><zh-CN>已 sanitize 的 report object。</zh-CN><en>Already-sanitized report object.</en></lang>
 * @returns {object} <lang><zh-CN>top-level frozen report；所需的 nested value 会单独冻结。</zh-CN><en>A top-level frozen report; required nested values are frozen separately.</en></lang>
 */
function freezeReport(report) {
  // <lang><zh-CN>report 只包含本模块创建的 plain records/arrays；此处不递归遍历 caller data。</zh-CN><en>The report contains only plain records/arrays created by this module; no caller data is recursively traversed here.</en></lang>
  return Object.freeze(report);
}

/** Fixed diagnostic text and reason families, owned by this module rather than caller input. / fixed diagnostic text 与 reason family 均由本模块拥有，而非 caller input。 */
const DIAGNOSTIC_DEFINITIONS = Object.freeze({
  HTMDOC_HTML_HANDOFF_VERSION_UNSUPPORTED: Object.freeze({
    reason: "version",
    message: "HTML-authoring handoff requires the supported draft contract and predecessor versions."
  }),
  HTMDOC_HTML_HANDOFF_IDENTITY_INVALID: Object.freeze({
    reason: "identity",
    message: "HTML-authoring handoff requires one valid canonical output identity and unique stable entry identities."
  }),
  HTMDOC_HTML_HANDOFF_CONFORMANCE_UNACCEPTED: Object.freeze({
    reason: "conformance",
    message: "HTML-authoring handoff requires a successful HTMDoc producer and accepted owner-local conformance result."
  }),
  HTMDOC_HTML_HANDOFF_SOURCE_POLICY_DENIED: Object.freeze({
    reason: "source-policy",
    message: "HTML-authoring handoff accepts only sourcesContentPolicy none."
  }),
  HTMDOC_HTML_HANDOFF_PRIVATE_DATA_DENIED: Object.freeze({
    reason: "private-data",
    message: "HTML-authoring handoff refuses source, map, sidecar, path, locator, credential, working-state, or unknown data."
  }),
  HTMDOC_HTML_HANDOFF_MAP_LINKAGE_DENIED: Object.freeze({
    reason: "map-linkage",
    message: "HTML-authoring handoff requires explicit ordinary-map linkage without an embedded handoff model."
  }),
  HTMDOC_HTML_HANDOFF_HOST_ACTION_DENIED: Object.freeze({
    reason: "host-action",
    message: "HTML-authoring handoff refuses target, Tauri, Obsidian, source-reader, network, publish, and adoption actions."
  })
});
