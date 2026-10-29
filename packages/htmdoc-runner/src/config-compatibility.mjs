/**
 * @file Exact config schemas, compatible reading and explicit migration.
 * @lang zh-CN 纯内存读取/迁移，不读配置路径或 schema URL；旧 schema 原字节不改。
 * @lang en Pure in-memory reading/migration without reading config paths or schema URLs; historical schema bytes stay unchanged.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { HTMDOC_CONFIG_JSON_SCHEMA, HTMDOC_CONFIG_SCHEMA_ID, HTMDOC_LEGACY_CONFIG_JSON_SCHEMA, HTMDOC_LEGACY_CONFIG_SCHEMA_ID } from "./schema.mjs";

/** @lang zh-CN 不回显 caller 字段或 Ajv 错误原文。 @lang en Excludes caller fields and raw Ajv errors. */
const failure = "HTMDoc config must match an exact supported identity and declared JSON structure.";
/** @lang zh-CN 固定本地 schema 的懒编译缓存，不使用 loadSchema 或网络。 @lang en Lazy compilation cache of a fixed local schema with no loadSchema or network. */
let currentValidator;

/**
 * @param {string} identity <lang><zh-CN>精确版本或 schema ID。</zh-CN><en>Exact version or schema ID.</en></lang>
 * @returns {object|undefined} <lang><zh-CN>原 schema；未知身份不猜默认。</zh-CN><en>Original schema; unknown identities have no guessed default.</en></lang>
 */
export function getHtmDocConfigSchema(identity) {
  if (identity === "1.0.0" || identity === HTMDOC_CONFIG_SCHEMA_ID) return HTMDOC_CONFIG_JSON_SCHEMA;
  if (identity === "0.1.0-draft" || identity === HTMDOC_LEGACY_CONFIG_SCHEMA_ID) return HTMDOC_LEGACY_CONFIG_JSON_SCHEMA;
  return undefined;
}

/**
 * @param {unknown} value <lang><zh-CN>精确旧/新配置 JSON。</zh-CN><en>Exact legacy/current config JSON.</en></lang>
 * @returns {void} <lang><zh-CN>有效时无值，不修改输入；旧 loader 默认按已确认兼容规则保留。</zh-CN><en>Returns no value when valid without mutation; legacy loader defaults follow confirmed compatibility rules.</en></lang>
 * @throws {TypeError} <lang><zh-CN>身份或目标兼容结构不合法时固定拒绝。</zh-CN><en>Fixed refusal for invalid identity or compatible structure.</en></lang>
 * @lang zh-CN 内部 loader helper，不从包根额外暴露 API。
 * @lang en Internal loader helper, not an additional package-root API.
 */
export function validateHtmDocConfigForReading(value) {
  try {
    // <lang><zh-CN>克隆后才临时协调验证视图；不重标 caller 对象或宣称旧 schema 接受默认缺省。</zh-CN><en>Only coordinate a cloned validation view, never relabeling caller data or claiming the old schema permits omitted defaults.</en></lang>
    const json = cloneJson(value);
    const schema = getHtmDocConfigSchema(json?.schemaVersion);
    if (!schema || (json.$schema !== undefined && json.$schema !== schema.$id)) throw new TypeError(failure);
    json.schemaVersion = "1.0.0";
    if (json.$schema !== undefined) json.$schema = HTMDOC_CONFIG_SCHEMA_ID;
    if (!currentValidator) {
      const ajv = new Ajv2020({ strict: false, allErrors: true });
      currentValidator = ajv.compile(HTMDOC_CONFIG_JSON_SCHEMA);
    }
    if (!currentValidator(json)) throw new TypeError(failure);
  } catch { throw new TypeError(failure); }
}

/**
 * @param {unknown} value <lang><zh-CN>精确旧配置的普通 JSON，允许已有 loader 的省略默认。</zh-CN><en>Ordinary JSON of an exact legacy config, allowing omissions supported by the existing loader.</en></lang>
 * @returns {object} <lang><zh-CN>只协调 schemaVersion/已有 $schema 的新副本，保留省略字段与全部内容。</zh-CN><en>Fresh copy coordinating only schemaVersion/existing $schema while preserving omissions and all content.</en></lang>
 * @throws {TypeError} <lang><zh-CN>未知/当前版本、非 JSON 或目标验证失败时固定拒绝。</zh-CN><en>Fixed refusal for unknown/current versions, non-JSON or failed target validation.</en></lang>
 */
export function migrateHtmDocConfig(value) {
  try {
    const json = cloneJson(value);
    if (json.schemaVersion !== "0.1.0-draft") throw new TypeError(failure);
    validateHtmDocConfigForReading(json);
    json.schemaVersion = "1.0.0";
    if (json.$schema !== undefined) json.$schema = HTMDOC_CONFIG_SCHEMA_ID;
    validateHtmDocConfigForReading(json);
    return json;
  } catch { throw new TypeError(failure); }
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
