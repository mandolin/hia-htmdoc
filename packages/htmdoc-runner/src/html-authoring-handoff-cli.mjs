#!/usr/bin/env node

/**
 * HTMDoc HTML-authoring metadata handoff 的显式文件 CLI。
 *
 * 本命令只读取一份 caller-selected metadata JSON file；绝不发现 repository、读取 source/artifact/source-map
 * body、打开 Tauri/Obsidian 或访问 network service。
 *
 * @lang en Explicit-file CLI for the HTMDoc HTML-authoring metadata handoff. The command reads exactly one caller-selected metadata JSON file. It never discovers a repository, reads source/artifact/source-map bodies, opens Tauri/Obsidian, or contacts a network service.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import {
  HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION,
  createHtmlAuthoringDocumentationHandoff
} from "./html-authoring-handoff.mjs";

/**
 * option set 特意不包含 target path、host、source-reader、network 或 publish switch。
 * @lang en The option set intentionally contains no target path, host, source-reader, network, or publish switch.
 */
const { values } = parseArgs({
  options: {
    help: { type: "boolean", short: "h" },
    input: { type: "string", short: "i" },
    out: { type: "string", short: "o" },
    version: { type: "boolean", short: "v" }
  },
  strict: true
});

/**
 * help 保持 static，不能检查 caller workspace。
 * @lang en Help remains static so it cannot inspect a caller workspace.
 */
if (values.help) {
  process.stdout.write(`HTMDoc HTML-authoring handoff ${HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION}\n\nUsage:\n  htmdoc-handoff --input <safe-relative-json> [--out <safe-relative-json>]\n\nThe command evaluates one explicit metadata-only request. It does not discover, read, run, or write a target project.\n`);
  process.exit(0);
}

/**
 * version output 只包含 package-local draft metadata。
 * @lang en Version output is package-local draft metadata only.
 */
if (values.version) {
  process.stdout.write(`${HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION}\n`);
  process.exit(0);
}

try {
  // <lang><zh-CN>在 read 前先限制 input path，禁止 traversal、URI、absolute path 或 empty segment 扩大读取范围。</zh-CN><en>Constrain the input path before reading so traversal, URIs, absolute paths, or empty segments cannot expand the read scope.</en></lang>
  const inputPath = resolveSafeRelativePath(values.input, "--input");
  // <lang><zh-CN>这是 CLI 唯一 filesystem input；不会从 JSON value 继续发现目录、target state 或 artifact。</zh-CN><en>This is the CLI's only filesystem input; no directory, target state, or artifact is discovered from the JSON value.</en></lang>
  const request = await readRequestJson(inputPath);
  // <lang><zh-CN>pure evaluator 只接收已解析 object，不能发起 Tauri/Obsidian/target/network action。</zh-CN><en>The pure evaluator receives only the parsed object and cannot initiate Tauri, Obsidian, target, or network action.</en></lang>
  const report = createHtmlAuthoringDocumentationHandoff(request);
  // <lang><zh-CN>serialized report 是唯一 output body；它没有 input path、source、target、host state 或 caller unknown field。</zh-CN><en>The serialized report is the only output body; it contains no input path, source, target, host state, or caller unknown field.</en></lang>
  const serialized = `${JSON.stringify(report, null, 2)}\n`;

  if (values.out) {
    // <lang><zh-CN>只有 caller 显式提供 safe-relative out 时写入；默认 stdout 不产生 filesystem write。</zh-CN><en>Write only when the caller explicitly provides a safe-relative out; stdout is the default and produces no filesystem write.</en></lang>
    const outputPath = resolveSafeRelativePath(values.out, "--out");
    await writeFile(outputPath, serialized, "utf8");
  } else {
    process.stdout.write(serialized);
  }

  // <lang><zh-CN>refused 是正常 fail-closed safety outcome，不能驱动 retry/source discovery。</zh-CN><en>Refused is a normal fail-closed safety outcome and cannot drive retry or source discovery.</en></lang>
  process.exitCode = report.status === "accepted" ? 0 : 1;
} catch (error) {
  // <lang><zh-CN>CLI error 不回显 JSON、path 或 filesystem detail，保持 public-safe surface。</zh-CN><en>CLI errors do not echo JSON, paths, or filesystem detail, preserving a public-safe surface.</en></lang>
  process.stderr.write(`HTMDoc handoff failed: ${safeErrorMessage(error)}\n`);
  process.exitCode = 1;
}

/**
 * 在 invocation directory 下解析一份安全 relative JSON path。
 *
 * @lang en Resolves one safe relative JSON path under the invocation directory.
 *
 * @param {unknown} value <lang><zh-CN>候选 CLI path。</zh-CN><en>Candidate CLI path.</en></lang>
 * @param {string} optionName <lang><zh-CN>public-safe option label。</zh-CN><en>Public-safe option label.</en></lang>
 * @returns {string} <lang><zh-CN>current working directory 下的 absolute file path。</zh-CN><en>Absolute file path under the current working directory.</en></lang>
 */
function resolveSafeRelativePath(value, optionName) {
  // <lang><zh-CN>Windows/POSIX separator 先统一，令 segment policy 对每种 host OS 一致。</zh-CN><en>Normalize Windows/POSIX separators first so segment policy is consistent on every host OS.</en></lang>
  const normalized = typeof value === "string" ? value.replaceAll("\\", "/") : "";
  // <lang><zh-CN>在 path.resolve 前检查 segment，防止 parent traversal 被 absolutization 掩盖。</zh-CN><en>Check segments before path.resolve so parent traversal cannot be hidden by absolutization.</en></lang>
  const segments = normalized.split("/");
  if (!normalized
    || normalized.startsWith("/")
    || normalized.startsWith("\\")
    || /^[A-Za-z]:/u.test(normalized)
    || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(normalized)
    || segments.includes("..")
    || segments.some((segment) => segment.length === 0)) {
    throw new TypeError(`${optionName} must be a safe relative path.`);
  }
  return path.resolve(process.cwd(), normalized);
}

/**
 * 读取一份显式 JSON request，同时从 CLI surface 隐藏 parser/filesystem detail。
 *
 * @lang en Reads one explicit JSON request while hiding parser/filesystem detail from the CLI surface.
 *
 * @param {string} filePath <lang><zh-CN>已验证 caller-selected path。</zh-CN><en>Validated caller-selected path.</en></lang>
 * @returns {Promise<unknown>} <lang><zh-CN>已解析 JSON value。</zh-CN><en>Parsed JSON value.</en></lang>
 */
async function readRequestJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    throw new TypeError("A selected handoff input must be a readable JSON object.");
  }
}

/**
 * 将 unexpected errors 转为固定 public-safe CLI message。
 *
 * @lang en Converts unexpected errors to a fixed public-safe CLI message.
 *
 * @param {unknown} error <lang><zh-CN>捕获到的 error。</zh-CN><en>Caught error.</en></lang>
 * @returns {string} <lang><zh-CN>不含 path/JSON 内容的 error text。</zh-CN><en>Error text without path/JSON content.</en></lang>
 */
function safeErrorMessage(error) {
  if (error instanceof TypeError && error.message.startsWith("--")) {
    return error.message;
  }
  return "Unable to evaluate an explicit HTML-authoring handoff request.";
}
