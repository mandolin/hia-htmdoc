import {runHtmDoc} from '@hia-doc/htmdoc-runner';
/** @lang zh-CN 复用纯模块的同一描述符对象。 @lang en Reuses the same descriptor object from its pure module. */
import {htmdocProducerDescriptor} from './descriptor.mjs';
export {htmdocProducerDescriptor} from './descriptor.mjs';

/**
 * @lang zh-CN 一次性无增量生产器；不在导入时读取/生成或连接宿主。
 * @lang en One-shot nonincremental producer; importing it performs no reads, generation or host integration.
 */
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
