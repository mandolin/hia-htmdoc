/**
 * @file Exact HTML extraction reading and lossless JSON migration.
 * @lang zh-CN 只编译随包 schema，拒绝未知版本/非 JSON；不读取 schema URL、源码或文件。
 * @lang en Compiles bundled schemas only, rejecting unknown versions/non-JSON without reading schema URLs, sources or files.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { HTMDOC_EXTRACTION_JSON_SCHEMA, HTMDOC_LEGACY_EXTRACTION_JSON_SCHEMA, HTMDOC_EXTRACTION_SCHEMA_ID, HTMDOC_LEGACY_EXTRACTION_SCHEMA_ID } from "./index.mjs";

/** @lang zh-CN 固定公开失败，不暴露 Ajv 原始诊断或输入。 @lang en Fixed public failure without raw Ajv diagnostics or input. */
const failure = "HTMDoc extraction must match an exact supported contract and JSON structure.";
/** @lang zh-CN 延迟缓存避免新旧 export 图的循环初始化读取；不启用远程 schema。 @lang en Lazy caching avoids cyclic export initialization reads and never enables remote schemas. */
const validators = new Map();

/**
 * @param {string} identity <lang><zh-CN>精确版本或 schema ID。</zh-CN><en>Exact version or schema ID.</en></lang>
 * @returns {object|undefined} <lang><zh-CN>对应的原 schema；未知值返回 undefined，无默认猜测。</zh-CN><en>Corresponding original schema; unknown identities return undefined with no guessed default.</en></lang>
 */
export function getHtmDocExtractionSchema(identity) {
  if (identity === "1.0.0" || identity === HTMDOC_EXTRACTION_SCHEMA_ID) return HTMDOC_EXTRACTION_JSON_SCHEMA;
  if (identity === "0.1.0-draft" || identity === HTMDOC_LEGACY_EXTRACTION_SCHEMA_ID) return HTMDOC_LEGACY_EXTRACTION_JSON_SCHEMA;
  return undefined;
}

/**
 * @param {unknown} value <lang><zh-CN>已物化的普通 JSON 提取件，不接受访问器或循环。</zh-CN><en>Materialized ordinary-JSON extraction excluding accessors/cycles.</en></lang>
 * @returns {Array<object>} <lang><zh-CN>有效为空，否则只含固定公开诊断；不改变输入。</zh-CN><en>Empty when valid, otherwise fixed public diagnostics only; input is unchanged.</en></lang>
 */
export function validateHtmDocExtraction(value) {
  try {
    // <lang><zh-CN>先验证纯 JSON，避免 Ajv 读取 getter 或静默丢失非 JSON 值。</zh-CN><en>Check plain JSON first so Ajv cannot read getters or silently discard non-JSON values.</en></lang>
    const json = cloneJson(value);
    const schema = getHtmDocExtractionSchema(json?.contractVersion);
    if (!schema || json?.profile?.version !== json.contractVersion) throw new TypeError(failure);
    if (!validators.has(json.contractVersion)) {
      // <lang><zh-CN>禁止 coercion/defaults/removeAdditional，迁移不能借验证修改输入。</zh-CN><en>No coercion/defaults/removeAdditional: validation must not modify migration inputs.</en></lang>
      const ajv = new Ajv2020({ strict: false, allErrors: true });
      validators.set(json.contractVersion, ajv.compile(schema));
    }
    if (!validators.get(json.contractVersion)(json)) throw new TypeError(failure);
    return [];
  } catch {
    return [{ code: "HTMDOC_EXTRACTION_INVALID", message: failure, severity: "error" }];
  }
}

/**
 * @param {unknown} value <lang><zh-CN>精确 0.1.0-draft JSON 提取件，扩展字段也必须为普通 JSON。</zh-CN><en>Exact 0.1.0-draft JSON extraction, with ordinary JSON extensions.</en></lang>
 * @returns {object} <lang><zh-CN>新对象，只协调契约/profile 身份，其余字段无损保留。</zh-CN><en>Fresh object coordinating only contract/profile identity while preserving all other fields losslessly.</en></lang>
 * @throws {TypeError} <lang><zh-CN>旧结构或目标验证失败时固定拒绝，不修改输入。</zh-CN><en>Fixed refusal when legacy structure or target validation fails; input is unchanged.</en></lang>
 */
export function migrateHtmDocExtraction(value) {
  try {
    const json = cloneJson(value);
    if (json.contractVersion !== "0.1.0-draft" || validateHtmDocExtraction(json).length) throw new TypeError(failure);
    json.contractVersion = "1.0.0";
    json.profile.version = "1.0.0";
    if (validateHtmDocExtraction(json).length) throw new TypeError(failure);
    return json;
  } catch {
    throw new TypeError(failure);
  }
}

/**
 * @param {unknown} value <lang><zh-CN>普通 JSON 值。</zh-CN><en>Ordinary JSON value.</en></lang>
 * @param {Set<object>} [active] <lang><zh-CN>当前递归栈，不跨调用共享。</zh-CN><en>Current recursion stack, never shared across calls.</en></lang>
 * @returns {unknown} <lang><zh-CN>不包含 getter、原型行为或共享可变容器的副本。</zh-CN><en>Copy without getters, prototype behavior or shared mutable containers.</en></lang>
 * @throws {TypeError} <lang><zh-CN>拒绝所有非 JSON 值/稀疏数组/隐藏属性。</zh-CN><en>Rejects non-JSON values, sparse arrays and hidden properties.</en></lang>
 */
function cloneJson(value, active = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object" || active.has(value)) throw new TypeError(failure);
  const array = Array.isArray(value);
  if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(failure);
  active.add(value);
  try {
    // <lang><zh-CN>描述符先检查，绝不通过普通属性读取触发用户访问器。</zh-CN><en>Inspect descriptors first, never triggering user accessors through ordinary property reads.</en></lang>
    const result = array ? [] : {};
    for (const key of Reflect.ownKeys(value)) {
      if (array && key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== "string" || !descriptor.enumerable || !("value" in descriptor) || (array && !/^(0|[1-9][0-9]*)$/.test(key))) throw new TypeError(failure);
      Object.defineProperty(result, key, { value: cloneJson(descriptor.value, active), enumerable: true, configurable: true, writable: true });
    }
    if (array && (result.length !== value.length || Object.keys(result).length !== value.length)) throw new TypeError(failure);
    return result;
  } finally { active.delete(value); }
}
