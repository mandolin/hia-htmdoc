/**
 * @file
 * @lang zh-CN 一次性子进程捕获真实HTMDoc parseArgs调用，原框架校验后结束探针。
 * @lang en Disposable child-process capture of the actual HTMDoc parseArgs call, ending the probe after native argument validation.
 */
import { createRequire, syncBuiltinESMExports } from "node:module";
import { writeSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";

// <lang><zh-CN>目标固定由owner工具传入；进程只用--help观察声明，数据从专用fd3返回。</zh-CN><en>The owner tool supplies the target, observes declarations with --help only, and receives data through dedicated fd3.</en></lang>
const cli = path.resolve(process.argv[2]);
const target = pathToFileURL(cli).href;
const require = createRequire(import.meta.url);
const util = require("node:util");
const native = util.parseArgs;
process.argv = [process.execPath, cli, "--help"];
util.parseArgs = (settings) => {
  // <lang><zh-CN>先运行原生严格解析，再读取实参表，观察不替代真实参数校验。</zh-CN><en>Run native strict parsing before reading the argument table, so observation never replaces actual validation.</en></lang>
  native(settings);
  const previous = Error.prepareStackTrace;
  let frames;
  try {
    Error.prepareStackTrace = (_, sites) => sites;
    frames = new Error().stack;
  } finally {
    Error.prepareStackTrace = previous;
  }
  const frame = frames.find(
    (site) => site.getFileName() === target || site.getFileName() === cli,
  );
  if (!frame || !Number.isSafeInteger(frame.getLineNumber()))
    throw new Error("Parser call location unavailable.");
  const observation = {
    options: Object.entries(settings.options).map(([name, value]) => ({
      name,
      valueType: value.type,
      ...(value.short ? { short: value.short } : {}),
    })),
    allowPositionals: settings.allowPositionals,
    strict: settings.strict,
    callLine: frame.getLineNumber(),
    cliSha256: createHash("sha256").update(readFileSync(cli)).digest("hex"),
  };
  writeSync(3, JSON.stringify(observation));
  // <lang><zh-CN>终止该观察调用，HTML CLI的既有错误边界接收固定异常，业务请求不会建立。</zh-CN><en>End this observation call with a fixed exception handled by the existing HTML CLI boundary, before any business request is created.</en></lang>
  throw new Error("Declaration observation completed.");
};
syncBuiltinESMExports();
await import(target);
