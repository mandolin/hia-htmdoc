import {
  HTMDOC_INPUT_KINDS,
  HTMDOC_OUTPUT_KINDS,
  HTMDOC_RUNNER_VERSION,
  runHtmDoc
} from "@hia-doc/htmdoc-runner";

/**
 * @lang zh-CN 已确认 documentation-producer 1.0.0 描述符；实现版本独立于契约身份，无运行时绝对路径。
 * @lang en Confirmed documentation-producer 1.0.0 descriptor; implementation version is independent from contract identity and excludes runtime absolute paths.
 */
export const htmdocProducerDescriptor = Object.freeze({
  contract: "documentation-producer",
  contractVersion: "1.0.0",
  id: "htmdoc",
  version: HTMDOC_RUNNER_VERSION,
  displayName: "HTMDoc",
  inputKinds: [...HTMDOC_INPUT_KINDS],
  outputKinds: [...HTMDOC_OUTPUT_KINDS],
  capabilities: {
    sourceLinkage: true,
    incremental: false,
    watch: false
  }
});

/** @lang zh-CN 一次性无增量生产器；不在导入时读取/生成或连接宿主。 @lang en One-shot nonincremental producer; importing it performs no reads, generation or host integration. */
export const htmdocProducer = Object.freeze({
  descriptor: htmdocProducerDescriptor,
  /**
   * @param {object} request <lang><zh-CN>原样交给 runner 的绝对运行根与相对输入请求。</zh-CN><en>Absolute runtime roots and relative inputs passed unchanged to the runner.</en></lang>
   * @param {object} [context] <lang><zh-CN>原样委派的中止/进度上下文。</zh-CN><en>Abort/progress context delegated unchanged.</en></lang>
   * @returns {Promise<object>} <lang><zh-CN>SDK 1.0.0 结果；输出副作用与异常见 runHtmDoc。</zh-CN><en>SDK 1.0.0 result; see runHtmDoc for output effects and exceptions.</en></lang>
   */
  produce(request, context = {}) {
    return runHtmDoc(request, context);
  }
});

export default htmdocProducer;
