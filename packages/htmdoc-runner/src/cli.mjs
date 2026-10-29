#!/usr/bin/env node

/**
 * @file HTMDoc standalone command with a single public-safe failure boundary.
 * @lang zh-CN 参数解析、配置读取和构建失败均不回显原始 argv/JSON/绝对路径；只在显式调用时生成文件。
 * @lang en Argument, config and build failures never echo raw argv/JSON/absolute paths; files are generated only on explicit invocation.
 */
import path from "node:path";
import { parseArgs } from "node:util";

import {
  HTMDOC_RUNNER_VERSION,
  inferHtmDocInputKind,
  loadHtmDocConfig,
  runHtmDoc
} from "./index.mjs";

try {
  // <lang><zh-CN>解析也必须在失败边界内，Node 的原始参数异常可能携带用户内容。</zh-CN><en>Parsing must be inside the failure boundary because native argument errors may contain user content.</en></lang>
  const { values, positionals } = parseArgs({
    options: {
      config: { type: "string", short: "c" },
      help: { type: "boolean", short: "h" },
      kind: { type: "string", short: "k" },
      "no-doc-source-map": { type: "boolean" },
      "out-dir": { type: "string", short: "o" },
      "sources-content-policy": { type: "string" },
      version: { type: "boolean", short: "v" },
      "workspace-root": { type: "string" }
    },
    allowPositionals: true,
    strict: true
  });

  if (values.help) {
    process.stdout.write(`HTMDoc ${HTMDOC_RUNNER_VERSION}\n\nUsage:\n  htmdoc --config htmdoc.config.json\n  htmdoc [options] <input...>\n\nOptions:\n  -c, --config <path>\n  -k, --kind <kind>\n  -o, --out-dir <path>\n      --workspace-root <path>\n      --sources-content-policy <none|reference|embed>\n      --no-doc-source-map\n  -v, --version\n`);
    process.exit(0);
  }

  if (values.version) {
    process.stdout.write(`${HTMDOC_RUNNER_VERSION}\n`);
    process.exit(0);
  }

  // <lang><zh-CN>配置与直接输入共享 runner 验证；所有覆盖最终再次经 runHtmDoc 校验。</zh-CN><en>Config and direct inputs share runner validation; final overrides are checked again by runHtmDoc.</en></lang>
  const request = values.config
    ? await loadHtmDocConfig(values.config)
    : createCliRequest(values, positionals);

  if (values["out-dir"]) {
    request.outputDirectory = path.resolve(request.workspaceRoot, values["out-dir"]);
  }
  if (values["sources-content-policy"]) {
    request.options.sourcesContentPolicy = values["sources-content-policy"];
  }
  if (values["no-doc-source-map"]) {
    request.options.emitDocSourceMap = false;
  }

  // <lang><zh-CN>stdout 只报告状态与计数，具体安全诊断保存在结果清单。</zh-CN><en>stdout reports only status/counts; detailed safe diagnostics remain in the result manifest.</en></lang>
  const result = await runHtmDoc(request);
  process.stdout.write(`HTMDoc ${result.status}: ${result.artifacts.length} artifact(s).\n`);
  process.exitCode = result.status === "success" ? 0 : 1;
} catch {
  process.stderr.write("HTMDoc failed: invalid arguments, configuration, or build operation.\n");
  process.exitCode = 1;
}

/**
 * @param {object} cliValues <lang><zh-CN>parseArgs 验证后的开关。</zh-CN><en>Options validated by parseArgs.</en></lang>
 * @param {string[]} inputs <lang><zh-CN>位置输入，相对工作根；runner 再验证安全边界。</zh-CN><en>Positional inputs relative to the workspace; the runner validates their safety.</en></lang>
 * @returns {object} <lang><zh-CN>仅在内存中携带绝对根的构建请求。</zh-CN><en>Build request carrying absolute roots in memory only.</en></lang>
 * @throws {TypeError} <lang><zh-CN>未提供输入时拒绝。</zh-CN><en>Rejects when no inputs are supplied.</en></lang>
 */
function createCliRequest(cliValues, inputs) {
  if (inputs.length === 0) {
    throw new TypeError("At least one input or --config is required.");
  }
  // <lang><zh-CN>cwd 是 CLI 的相对基准，不能进入公开结果。</zh-CN><en>cwd is the CLI relative base and must not enter public results.</en></lang>
  const workspaceRoot = path.resolve(process.cwd(), cliValues["workspace-root"] ?? ".");
  return {
    workspaceRoot,
    outputDirectory: path.resolve(workspaceRoot, cliValues["out-dir"] ?? "dist/htmdoc"),
    inputs: inputs.map((inputPath) => ({
      kind: cliValues.kind ?? inferHtmDocInputKind(inputPath),
      path: inputPath
    })),
    options: {
      emitDocSourceMap: !cliValues["no-doc-source-map"],
      sourcesContentPolicy: cliValues["sources-content-policy"] ?? "none",
      writeResultManifest: true
    }
  };
}
