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
  /**
   * @lang zh-CN 生产器协议身份，用于宿主发现和校验。
   * @lang en Producer contract identity used for host discovery and validation.
   */
  contract: "documentation-producer",
  /**
   * @lang zh-CN 生产器协议版本，用于主SDK精确匹配。
   * @lang en Producer contract version used for exact matching by the main SDK.
   */
  contractVersion: "1.0.0",
  /**
   * @lang zh-CN 当前文档生产器的稳定领域标识。
   * @lang en Stable domain identifier of this documentation producer.
   */
  id: "htmdoc",
  /**
   * @lang zh-CN 生产器实现版本，取自当前运行器。
   * @lang en Producer implementation version supplied by the current runner.
   */
  version: HTMDOC_RUNNER_VERSION,
  /**
   * @lang zh-CN 供宿主显示的生产器名称。
   * @lang en Producer name presented by the host.
   */
  displayName: "HTMDoc",
  /**
   * @lang zh-CN 当前运行器接受的显式输入种类。
   * @lang en Explicit input kinds accepted by the current runner.
   */
  inputKinds: [...HTMDOC_INPUT_KINDS],
  /**
   * @lang zh-CN 当前运行器声明的输出工件种类。
   * @lang en Output artifact kinds declared by the current runner.
   */
  outputKinds: [...HTMDOC_OUTPUT_KINDS],
  /**
   * @lang zh-CN 供主SDK校验的来源关联、增量和监视能力声明。
   * @lang en Source-linkage, incremental and watch capability declarations validated by the main SDK.
   */
  capabilities: {
    /**
     * @lang zh-CN 声明支持来源关联，具体定位精度由实际产物描述。
     * @lang en Declares source-linkage support with precision described by the actual artifacts.
     */
    sourceLinkage: true,
    /**
     * @lang zh-CN 取false，每次执行处理完整请求的输入集。
     * @lang en False selects full processing of the requested input set on each invocation.
     */
    incremental: false,
    /**
     * @lang zh-CN 取false，每次构建由宿主的独立请求触发。
     * @lang en False selects individual host-triggered build requests.
     */
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
