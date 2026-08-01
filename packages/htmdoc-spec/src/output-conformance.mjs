/**
 * Owner-local contract identity for HTMDoc output conformance summaries.
 *
 * 中文：HTMDoc 输出 conformance summary 的 owner-local contract identity。
 * English: Owner-local contract identity for HTMDoc output conformance summaries.
 */
export const HTMDOC_OUTPUT_CONFORMANCE_CONTRACT = "htmdoc-output-conformance";

/**
 * Frozen draft version for the owner-local HTMDoc output conformance result.
 *
 * 中文：HTMDoc owner-local 输出 conformance result 的冻结 draft version。
 * English: Frozen draft version for the owner-local HTMDoc output conformance result.
 */
export const HTMDOC_OUTPUT_CONFORMANCE_VERSION = "0.1.0-draft";

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

/**
 * Evaluate whether already-materialized HTMDoc artifacts preserve the owner-local P1 output boundary.
 *
 * 中文：评估已经 materialized 的 HTMDoc artifact 是否保持 owner-local P1 output boundary。
 * English: Evaluate whether already-materialized HTMDoc artifacts preserve the owner-local P1 output boundary.
 *
 * @param {unknown} artifacts <lang><zh-CN>extraction、HIA document、ordinary doc-source-map 与 producer result 的固定 bundle。</zh-CN><en>Fixed bundle containing extraction, HIA document, ordinary doc-source-map, and producer result.</en></lang>
 * @param {{allowEmbeddedSource?: boolean}} [options] <lang><zh-CN>只允许 caller 显式确认 `embed`；缺省保持 `none`/`reference` 不嵌入。</zh-CN><en>Only permits `embed` after explicit caller confirmation; the default keeps `none`/`reference` unembedded.</en></lang>
 * @returns {{contract:string,contractVersion:string,conformant:boolean,violations:Array<{code:string,message:string}>}} <lang><zh-CN>不含 artifact 内容的确定性 summary。</zh-CN><en>Deterministic summary containing no artifact content.</en></lang>
 * @lang zh-CN 函数只比较 caller 已提供的 JSON records；不接收文件路径、workspace root、source text、network 或 sidecar path，也不会产生写入。
 */
export function evaluateHtmDocOutputConformance(artifacts, options = {}) {
  // <lang><zh-CN>violation 仅累积固定 code/message，避免诊断把不可信 artifact 字段回显到 public output。</zh-CN><en>Violations accumulate only fixed code/message pairs so diagnostics never echo untrusted artifact fields into public output.</en></lang>
  const violations = [];
  // <lang><zh-CN>bundle 是唯一允许的根形状；array/primitive 无法安全承载四类关联 artifact。</zh-CN><en>The bundle is the only allowed root shape; an array or primitive cannot safely carry the four related artifact classes.</en></lang>
  const bundle = isRecord(artifacts) ? artifacts : undefined;
  if (!bundle) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_INPUT_INVALID", "HTMDoc output conformance requires an artifact bundle object.");
    return createSummary(violations);
  }

  // <lang><zh-CN>只从固定字段提取 artifact；evaluator 不接受自由命名的 artifact、路径或 I/O callback。</zh-CN><en>Extract artifacts only from fixed fields; the evaluator accepts no freely named artifact, path, or I/O callback.</en></lang>
  const extraction = isRecord(bundle.extraction) ? bundle.extraction : undefined;
  const document = isRecord(bundle.document) ? bundle.document : undefined;
  const docSourceMap = isRecord(bundle.docSourceMap) ? bundle.docSourceMap : undefined;
  const producerResult = isRecord(bundle.producerResult) ? bundle.producerResult : undefined;
  // <lang><zh-CN>embed 许可只由 boolean true 开启；truthy 值或 artifact 内声明均不能绕过默认保护。</zh-CN><en>Embed permission is enabled only by boolean true; truthy values or artifact declarations cannot bypass the default protection.</en></lang>
  const allowEmbeddedSource = options?.allowEmbeddedSource === true;

  // <lang><zh-CN>root check 先确立后续 relation/privacy 检查的最小可信 shape。</zh-CN><en>Root checks establish the minimum trusted shape needed by later relation and privacy checks.</en></lang>
  const extractionValid = validateExtraction(extraction, violations);
  const documentValid = validateDocument(document, extraction, violations);
  const mapValid = validateDocSourceMap(docSourceMap, extraction, allowEmbeddedSource, violations);
  // <lang><zh-CN>只有各 artifact 根有效时才计算跨 artifact continuity，避免 malformed input 触发隐式 property access。</zh-CN><en>Compute cross-artifact continuity only after each root is valid, avoiding implicit property access on malformed input.</en></lang>
  if (extractionValid && documentValid && mapValid) {
    validateArtifactRelations(extraction, document, docSourceMap, violations);
  }
  // <lang><zh-CN>producer result 最后验证，因为它将三份 artifact 的 delivery metadata 汇聚为外部可消费边界。</zh-CN><en>Validate the producer result last because it aggregates delivery metadata for all three artifacts into the externally consumable boundary.</en></lang>
  validateProducerResult(producerResult, docSourceMap, violations);

  return createSummary(violations);
}

/**
 * Create the stable, content-free conformance result shape.
 *
 * 中文：创建稳定且不含内容的 conformance result shape。
 * English: Create the stable, content-free conformance result shape.
 *
 * @param {Array<{code:string,message:string}>} violations <lang><zh-CN>已过滤为固定值的 violation。</zh-CN><en>Violations already filtered to fixed values.</en></lang>
 * @returns {{contract:string,contractVersion:string,conformant:boolean,violations:Array<{code:string,message:string}>}} <lang><zh-CN>不可变语义的 summary record。</zh-CN><en>Summary record with immutable semantics.</en></lang>
 */
function createSummary(violations) {
  // <lang><zh-CN>contract/version 与 boolean 结论永远同时返回，使 caller 无需从 exception text 推断 evaluator 版本。</zh-CN><en>Always return contract/version with the boolean conclusion so callers never infer evaluator version from exception text.</en></lang>
  return {
    contract: HTMDOC_OUTPUT_CONFORMANCE_CONTRACT,
    contractVersion: HTMDOC_OUTPUT_CONFORMANCE_VERSION,
    conformant: violations.length === 0,
    violations
  };
}

/**
 * Validate the extraction root and its source-content policy without reading source content.
 *
 * 中文：验证 extraction root 和 source-content policy；不读取 source content。
 * English: Validate the extraction root and source-content policy without reading source content.
 *
 * @param {Record<string, unknown>|undefined} extraction <lang><zh-CN>候选 HTMDoc extraction。</zh-CN><en>Candidate HTMDoc extraction.</en></lang>
 * @param {Array<{code:string,message:string}>} violations <lang><zh-CN>固定 violation accumulator。</zh-CN><en>Fixed violation accumulator.</en></lang>
 * @returns {boolean} <lang><zh-CN>root 是否足以安全进入 relation check。</zh-CN><en>Whether the root is safe enough for relation checks.</en></lang>
 */
function validateExtraction(extraction, violations) {
  // <lang><zh-CN>contract/version/symbols/source 是所有 downstream projection 的最小连续性锚点。</zh-CN><en>Contract/version/symbols/source are the minimum continuity anchors for every downstream projection.</en></lang>
  if (!extraction || extraction.contract !== "hia-htmdoc-extraction" || extraction.contractVersion !== "0.1.0-draft" || !Array.isArray(extraction.symbols) || !isRecord(extraction.source)) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_EXTRACTION_INVALID", "HTMDoc extraction must expose the supported contract, version, source, and symbols.");
    return false;
  }
  // <lang><zh-CN>source path 只允许 relative logical identity，既不 canonicalize 也不访问 filesystem。</zh-CN><en>The source path permits only a relative logical identity; it is neither canonicalized nor sent to the filesystem.</en></lang>
  const sourcePath = extraction.source.path;
  const sourceMap = isRecord(extraction.sourceMap) ? extraction.sourceMap : undefined;
  const policy = sourceMap?.sourcesContentPolicy;
  if (!isSafeRelativePath(sourcePath) || !isSupportedSourcePolicy(policy)) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_SOURCE_POLICY_INVALID", "HTMDoc extraction must use a safe relative source identity and supported source-content policy.");
    return false;
  }
  return true;
}

/**
 * Validate the projected HIA document against the extraction's stable symbol identities.
 *
 * 中文：按 extraction 的 stable symbol identity 验证 projected HIA document。
 * English: Validate the projected HIA document against the extraction's stable symbol identities.
 *
 * @param {Record<string, unknown>|undefined} document <lang><zh-CN>候选 HIA document。</zh-CN><en>Candidate HIA document.</en></lang>
 * @param {Record<string, unknown>|undefined} extraction <lang><zh-CN>已检查的 extraction root。</zh-CN><en>Previously checked extraction root.</en></lang>
 * @param {Array<{code:string,message:string}>} violations <lang><zh-CN>固定 violation accumulator。</zh-CN><en>Fixed violation accumulator.</en></lang>
 * @returns {boolean} <lang><zh-CN>document root 是否足以安全进入 relation check。</zh-CN><en>Whether the document root is safe enough for relation checks.</en></lang>
 */
function validateDocument(document, extraction, violations) {
  // <lang><zh-CN>document 使用现有 HIA 0.2 形状；本检查不把 owner-local evaluator 误作新的 document schema。</zh-CN><en>The document uses the existing HIA 0.2 shape; this check does not mistake the owner-local evaluator for a new document schema.</en></lang>
  if (!document || document.schemaVersion !== "0.2.0" || !Array.isArray(document.symbols) || !extraction) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_DOCUMENT_INVALID", "HTMDoc HIA document must retain the supported core shape and symbol array.");
    return false;
  }
  return true;
}

/**
 * Validate ordinary doc-source-map linkage, policy propagation, and the no-sidecar-by-default boundary.
 *
 * 中文：验证 ordinary doc-source-map linkage、policy propagation 与默认无 sidecar 边界。
 * English: Validate ordinary doc-source-map linkage, policy propagation, and the no-sidecar-by-default boundary.
 *
 * @param {Record<string, unknown>|undefined} docSourceMap <lang><zh-CN>候选 ordinary doc-source-map。</zh-CN><en>Candidate ordinary doc-source-map.</en></lang>
 * @param {Record<string, unknown>|undefined} extraction <lang><zh-CN>已检查的 extraction root。</zh-CN><en>Previously checked extraction root.</en></lang>
 * @param {boolean} allowEmbeddedSource <lang><zh-CN>caller 是否明确确认 embed。</zh-CN><en>Whether the caller explicitly confirmed embed.</en></lang>
 * @param {Array<{code:string,message:string}>} violations <lang><zh-CN>固定 violation accumulator。</zh-CN><en>Fixed violation accumulator.</en></lang>
 * @returns {boolean} <lang><zh-CN>map root 是否足以安全进入 relation check。</zh-CN><en>Whether the map root is safe enough for relation checks.</en></lang>
 */
function validateDocSourceMap(docSourceMap, extraction, allowEmbeddedSource, violations) {
  // <lang><zh-CN>普通 map 必须保留 explicit sources/artifacts/chains/entries；它仍不是完整 capability model。</zh-CN><en>An ordinary map must retain explicit sources/artifacts/chains/entries; it is still not a full capability model.</en></lang>
  if (!docSourceMap || docSourceMap.contract !== "doc-source-map" || docSourceMap.contractVersion !== "0.1.0-draft" || !Array.isArray(docSourceMap.sources) || !Array.isArray(docSourceMap.artifacts) || !Array.isArray(docSourceMap.chains) || !Array.isArray(docSourceMap.entries) || !extraction) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_PROVENANCE_INVALID", "HTMDoc doc-source-map must retain the supported ordinary-map identity and relation arrays.");
    return false;
  }
  // <lang><zh-CN>HTMDoc P1 尚未生产 metadata sidecar；任何未审核 sidecar field 都必须拒绝，防止私有 locator 或 body 偷渡。</zh-CN><en>HTMDoc P1 does not produce metadata sidecars; reject any unreviewed sidecar field to prevent private locators or bodies from bypassing review.</en></lang>
  const sidecarKeys = Object.keys(docSourceMap).filter((key) => key.toLocaleLowerCase("en-US").includes("sidecar"));
  if (sidecarKeys.length > 0 || Object.hasOwn(docSourceMap, "capabilities") || Object.hasOwn(docSourceMap, "capability") || Object.hasOwn(docSourceMap, "outputCapabilities")) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_SIDECAR_BOUNDARY_INVALID", "HTMDoc ordinary doc-source-map must not embed a sidecar or capability model before an explicitly reviewed owner feature exists.");
  }
  // <lang><zh-CN>source/map privacy 值必须一起传播；单独存在 policy 不能证明 paths/body 已被拒绝。</zh-CN><en>Source/map privacy values must propagate together; policy alone does not prove paths or bodies were denied.</en></lang>
  const source = isRecord(docSourceMap.sources[0]) ? docSourceMap.sources[0] : undefined;
  const privacy = isRecord(docSourceMap.privacy) ? docSourceMap.privacy : undefined;
  const extractionPolicy = extraction.sourceMap?.sourcesContentPolicy;
  if (docSourceMap.sources.length !== 1 || !source || source.path !== extraction.source.path || source.sourcesContentPolicy !== extractionPolicy ||
    !privacy || privacy.sourcesContentPolicy !== extractionPolicy || privacy.allowAbsolutePaths !== false || privacy.allowUncPaths !== false || privacy.allowPathTraversal !== false) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_SOURCE_POLICY_INVALID", "HTMDoc doc-source-map must preserve one safe source identity and all source-policy privacy denials.");
    return false;
  }
  // <lang><zh-CN>`none` 的 extraction source 不能携带 content；`embed` 既要存在 content 又要获得本次 caller 的显式确认。</zh-CN><en>A `none` extraction source cannot carry content; `embed` requires both content and explicit confirmation from this caller.</en></lang>
  const sourceContainsContent = Object.hasOwn(extraction.source, "sourcesContent") && typeof extraction.source.sourcesContent === "string";
  if (extractionPolicy === "none" && sourceContainsContent) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_SOURCE_POLICY_INVALID", "HTMDoc sourcesContentPolicy none must not serialize extraction source content.");
  }
  if (extractionPolicy === "embed" && !sourceContainsContent) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_SOURCE_POLICY_INVALID", "HTMDoc sourcesContentPolicy embed requires explicitly provided extraction source content.");
  }
  if (extractionPolicy === "embed" && !allowEmbeddedSource) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_EMBED_UNAUTHORIZED", "HTMDoc embedded source content requires explicit evaluator confirmation.");
  }
  return true;
}

/**
 * Validate symbol, entry, artifact, and chain continuity without relying on array ordering outside the map contract.
 *
 * 中文：验证 symbol、entry、artifact、chain continuity；除 map contract 外不依赖 array ordering。
 * English: Validate symbol, entry, artifact, and chain continuity without relying on array ordering outside the map contract.
 *
 * @param {Record<string, unknown>} extraction <lang><zh-CN>已验证的 extraction。</zh-CN><en>Validated extraction.</en></lang>
 * @param {Record<string, unknown>} document <lang><zh-CN>已验证的 HIA document。</zh-CN><en>Validated HIA document.</en></lang>
 * @param {Record<string, unknown>} docSourceMap <lang><zh-CN>已验证的 doc-source-map。</zh-CN><en>Validated doc-source-map.</en></lang>
 * @param {Array<{code:string,message:string}>} violations <lang><zh-CN>固定 violation accumulator。</zh-CN><en>Fixed violation accumulator.</en></lang>
 * @returns {void} <lang><zh-CN>只向 accumulator 追加固定 violation。</zh-CN><en>Only appends fixed violations to the accumulator.</en></lang>
 */
function validateArtifactRelations(extraction, document, docSourceMap, violations) {
  // <lang><zh-CN>symbol id set 是 extraction 到 document/map 的稳定连接；重复/空 id 一律不可作为 public entry identity。</zh-CN><en>The symbol-id set is the stable extraction-to-document/map link; duplicate or empty ids can never serve as public entry identities.</en></lang>
  const extractionSymbols = extraction.symbols.filter(isRecord);
  const symbolIds = extractionSymbols.map((symbol) => symbol.id).filter(isNonEmptyString);
  const uniqueSymbolIds = new Set(symbolIds);
  if (extractionSymbols.length !== extraction.symbols.length || symbolIds.length !== extractionSymbols.length || uniqueSymbolIds.size !== symbolIds.length) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_RELATION_INVALID", "HTMDoc extraction symbols must expose unique non-empty stable identities.");
    return;
  }
  // <lang><zh-CN>document symbol index 按 id 查找，不受 renderer/consumer 重排影响。</zh-CN><en>Index document symbols by id so renderer or consumer reordering has no effect.</en></lang>
  const documentSymbols = Array.isArray(document.symbols) ? document.symbols.filter(isRecord) : [];
  const documentById = new Map(documentSymbols.map((symbol) => [symbol.id, symbol]));
  for (const symbolId of symbolIds) {
    // <lang><zh-CN>每个 extraction symbol 必须投影为同 id 且指向同一 safe relative source 的 HIA symbol。</zh-CN><en>Each extraction symbol must project to a same-id HIA symbol pointing at the same safe relative source.</en></lang>
    const documentSymbol = documentById.get(symbolId);
    const definedIn = isRecord(documentSymbol?.source) && isRecord(documentSymbol.source.definedIn) ? documentSymbol.source.definedIn : undefined;
    if (!documentSymbol || definedIn?.relativePath !== extraction.source.path) {
      addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_RELATION_INVALID", "HTMDoc HIA document must preserve each stable symbol identity and public-safe source relation.");
      break;
    }
  }
  // <lang><zh-CN>ordinary map 的 entries 与 two-stage chain 是 provenance continuity，不是 source body 或 renderer tree。</zh-CN><en>The ordinary map's entries and two-stage chain establish provenance continuity, not a source body or renderer tree.</en></lang>
  const entrySymbolIds = docSourceMap.entries.filter(isRecord).map((entry) => entry.symbolId).filter(isNonEmptyString);
  const entrySymbolIdSet = new Set(entrySymbolIds);
  const hasExpectedArtifacts = docSourceMap.artifacts.filter(isRecord).some((artifact) => artifact.id === "artifact:htmdoc:extraction") &&
    docSourceMap.artifacts.filter(isRecord).some((artifact) => artifact.id === "artifact:hia:document");
  const chain = docSourceMap.chains.filter(isRecord)[0];
  if (entrySymbolIds.length !== symbolIds.length || entrySymbolIdSet.size !== symbolIds.length || symbolIds.some((symbolId) => !entrySymbolIdSet.has(symbolId)) || !hasExpectedArtifacts || !chain || !Array.isArray(chain.stages) || chain.stages.length !== 2) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_PROVENANCE_INVALID", "HTMDoc doc-source-map must retain one entry per stable symbol and the extraction-to-HIA two-stage provenance chain.");
  }
}

/**
 * Validate that the producer result delivers each supplied artifact through public-safe relative paths.
 *
 * 中文：验证 producer result 通过 public-safe relative paths delivery 每个 supplied artifact。
 * English: Validate that the producer result delivers each supplied artifact through public-safe relative paths.
 *
 * @param {Record<string, unknown>|undefined} producerResult <lang><zh-CN>候选 documentation-producer-result。</zh-CN><en>Candidate documentation-producer-result.</en></lang>
 * @param {Record<string, unknown>|undefined} docSourceMap <lang><zh-CN>候选 doc-source-map。</zh-CN><en>Candidate doc-source-map.</en></lang>
 * @param {Array<{code:string,message:string}>} violations <lang><zh-CN>固定 violation accumulator。</zh-CN><en>Fixed violation accumulator.</en></lang>
 * @returns {void} <lang><zh-CN>只向 accumulator 追加固定 violation。</zh-CN><en>Only appends fixed violations to the accumulator.</en></lang>
 */
function validateProducerResult(producerResult, docSourceMap, violations) {
  // <lang><zh-CN>result metadata 是 target consumer 看到的 delivery boundary；它不能以 failed/partial 状态假装 conformance 成功。</zh-CN><en>Result metadata is the delivery boundary seen by target consumers; a failed or partial state cannot masquerade as conformance success.</en></lang>
  const artifacts = Array.isArray(producerResult?.artifacts) ? producerResult.artifacts.filter(isRecord) : [];
  const producer = isRecord(producerResult?.producer) ? producerResult.producer : undefined;
  if (!producerResult || producerResult.contract !== "documentation-producer-result" || producerResult.contractVersion !== "0.1.0-draft" || producer?.id !== "htmdoc" || producerResult.status !== "success" || artifacts.length === 0 || !docSourceMap) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_PRODUCER_RESULT_INVALID", "HTMDoc producer result must expose the successful supported contract and delivery metadata.");
    return;
  }
  // <lang><zh-CN>artifact path 仅验证 logical relative form；不 resolve、不访问 disk，也不会把 path 写入 violation。</zh-CN><en>Validate artifact paths only as logical relative forms; do not resolve, access disk, or copy paths into violations.</en></lang>
  const pathsAreSafe = artifacts.every((artifact) => isSafeRelativePath(artifact.path));
  const hasRequiredKinds = ["htmdoc-extraction", "hia-document", "doc-source-map"].every((kind) => artifacts.some((artifact) => artifact.kind === kind));
  const mapArtifact = artifacts.find((artifact) => artifact.kind === "doc-source-map");
  const mapPathMatches = mapArtifact && docSourceMap.artifacts.filter(isRecord).every((artifact) => isSafeRelativePath(artifact.path));
  if (!pathsAreSafe || !hasRequiredKinds || !mapPathMatches) {
    addViolation(violations, "HTMDOC_OUTPUT_CONFORMANCE_PRODUCER_RESULT_INVALID", "HTMDoc producer result must deliver the extraction, HIA document, and ordinary doc-source-map through safe relative artifacts.");
  }
}

/**
 * Append one fixed violation only once, preserving deterministic diagnostics without sensitive input interpolation.
 *
 * 中文：仅追加一次固定 violation，保持确定性诊断且不插入敏感 input。
 * English: Append one fixed violation only once, preserving deterministic diagnostics without sensitive input interpolation.
 *
 * @param {Array<{code:string,message:string}>} violations <lang><zh-CN>固定 violation accumulator。</zh-CN><en>Fixed violation accumulator.</en></lang>
 * @param {string} code <lang><zh-CN>已冻结 public-safe code。</zh-CN><en>Frozen public-safe code.</en></lang>
 * @param {string} message <lang><zh-CN>不含 caller value 的固定 English message。</zh-CN><en>Fixed English message containing no caller value.</en></lang>
 * @returns {void} <lang><zh-CN>无返回；原地保持 accumulator 的首次出现顺序。</zh-CN><en>No return; preserves first-occurrence order in the accumulator.</en></lang>
 */
function addViolation(violations, code, message) {
  // <lang><zh-CN>重复 code 不增加噪声；一条 code 足以说明该 invariant 已被破坏。</zh-CN><en>A duplicate code adds no signal; one code is sufficient to show that its invariant was violated.</en></lang>
  if (!violations.some((violation) => violation.code === code)) {
    violations.push({ code, message });
  }
}

/**
 * Determine whether a candidate is an object record suitable for fixed-field inspection.
 *
 * 中文：确定 candidate 是否为可作固定字段检查的 object record。
 * English: Determine whether a candidate is an object record suitable for fixed-field inspection.
 *
 * @param {unknown} value <lang><zh-CN>未受信任值。</zh-CN><en>Untrusted value.</en></lang>
 * @returns {value is Record<string, unknown>} <lang><zh-CN>record type guard。</zh-CN><en>Record type guard.</en></lang>
 */
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Determine whether a candidate is a non-empty string identity.
 *
 * 中文：确定 candidate 是否为 non-empty string identity。
 * English: Determine whether a candidate is a non-empty string identity.
 *
 * @param {unknown} value <lang><zh-CN>未受信任 identity candidate。</zh-CN><en>Untrusted identity candidate.</en></lang>
 * @returns {value is string} <lang><zh-CN>是否可用作 stable identity。</zh-CN><en>Whether it can serve as a stable identity.</en></lang>
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Check the logical path form without resolving it against the process working directory.
 *
 * 中文：检查 logical path form，不相对 process working directory 做 resolve。
 * English: Check the logical path form without resolving it against the process working directory.
 *
 * @param {unknown} value <lang><zh-CN>候选 artifact/source path。</zh-CN><en>Candidate artifact/source path.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否为 safe relative logical path。</zh-CN><en>Whether it is a safe relative logical path.</en></lang>
 */
function isSafeRelativePath(value) {
  // <lang><zh-CN>拒绝 drive、scheme、absolute、UNC 和 parent traversal，保持 artifact identity 不泄漏 host locator。</zh-CN><en>Reject drive, scheme, absolute, UNC, and parent traversal forms so artifact identity does not leak a host locator.</en></lang>
  const normalized = typeof value === "string" ? value.replaceAll("\\", "/") : "";
  return Boolean(normalized) && !normalized.startsWith("/") && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) && !normalized.split("/").includes("..");
}

/**
 * Restrict policy values to the already documented HTMDoc source-content choices.
 *
 * 中文：将 policy 限制为已文档化的 HTMDoc source-content choices。
 * English: Restrict policy values to the already documented HTMDoc source-content choices.
 *
 * @param {unknown} value <lang><zh-CN>候选 source-content policy。</zh-CN><en>Candidate source-content policy.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否为受支持 policy。</zh-CN><en>Whether it is a supported policy.</en></lang>
 */
function isSupportedSourcePolicy(value) {
  return value === "none" || value === "reference" || value === "embed";
}
