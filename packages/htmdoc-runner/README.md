# @hia-doc/htmdoc-runner

Standalone API and CLI for HTML documentation projects.

```sh
npm install --save-dev @hia-doc/htmdoc-runner
```

Current source JSON configs use `schemaVersion: "1.0.0"` and retain exact
`0.1.0-draft` reads. The package exports
`HTMDOC_CONFIG_JSON_SCHEMA` for validation and editor integration.

```js
import path from "node:path";
import { runHtmDoc } from "@hia-doc/htmdoc-runner";

const result = await runHtmDoc({
  workspaceRoot: process.cwd(),
  outputDirectory: path.resolve("dist/htmdoc"),
  inputs: [{ kind: "html", path: "src/index.html" }]
});
```

The runner accepts `html`, `html-fragment`, `html-template` and
`custom-elements-manifest` inputs. It writes HTMDoc extraction artifacts, HIA
documents, direct-source documentation maps and a documentation producer result.

Current source builds write `documentation-producer-result@1.0.0`; existing
published package versions are unchanged. `options.emitDocSourceMap` and
`options.writeResultManifest` default to `true` and accept only booleans.
`sourcesContentPolicy` defaults to `none` and accepts exactly `none`,
`reference` or `embed`. A supplied input `language` must be a nonempty string;
`profileIds` defaults to `["htmdoc"]` and must be nonempty, unique lower-case
identifiers. Explicit `null` is not an omitted optional value.

`runHtmDoc()` validates declared input types before creating output. It writes
incrementally, without rolling back or deleting previous files. Per-input
failures become relative-path diagnostics; output-root/manifest I/O failures
and caller progress-callback exceptions propagate. The CLI exits nonzero on
failure and reports a fixed safe error rather than raw arguments, JSON or
absolute paths. `loadHtmDocConfig()` also redacts read/JSON syntax failures.

The legacy exported schema still requires explicit directories and input
`kind`, while the existing loader supplies defaults. Use explicit values when
validating legacy config documents; the historical schema identity has not
been rewritten by these runtime fixes.

## Versioned config and migration

`getHtmDocConfigSchema(versionOrId)` returns the exact current or historical
schema; unknown identities return `undefined`. `HTMDOC_LEGACY_CONFIG_*` expose
the original schema and identity. New config permits omitted `workspaceRoot`
(`.`), `outputDirectory` (`dist/htmdoc`) and input `kind` (filename inference).
The old schema remains stricter while the loader preserves its historical
defaults. Neither schema validation nor reading inserts values into input JSON.

`migrateHtmDocConfig(oldConfig)` is explicit, pure and lossless. It accepts only
the exact legacy identity with supported JSON structure, changes
`schemaVersion` and an existing `$schema`, preserves omissions, and validates
the target. It returns a fresh object and throws a fixed `TypeError` for invalid,
current or unknown versions, cycles, accessors and non-JSON data. It performs
no file/network I/O. Bundled schemas are available at
`@hia-doc/htmdoc-runner/schemas/htmdoc-config-1.0.0.schema.json` and the matching
`htmdoc-config-0.1.0-draft.schema.json` subpath; their URLs are identities, not
remote resources fetched by the runner.

```sh
htmdoc --config htmdoc.config.json
```

Source content is not embedded unless `sourcesContentPolicy: "embed"` is set
explicitly in the config `options` object.

## HTML-authoring metadata handoff

中文。随包指南含完整合成请求、接受与拒绝示例、退出码及输出写入说明。
See the bundled [handoff guide](HANDOFF.md) for complete synthetic requests, accepted/refused runs, exit codes, and output effects.

`createHtmlAuthoringDocumentationHandoff()` evaluates one explicit,
metadata-only handoff request. It accepts only `sourcesContentPolicy: "none"`,
stable output/entry identities, an accepted HTMDoc conformance summary, and an
ordinary-map linkage declaration. The result is `accepted` or `refused` and
does not contain source, artifact/map/sidecar bodies, paths, locators,
credentials, target state, or host API handles.

```js
import { createHtmlAuthoringDocumentationHandoff } from "@hia-doc/htmdoc-runner";

const report = createHtmlAuthoringDocumentationHandoff(metadataRequest);
```

The optional `htmdoc-handoff --input handoff.json [--out report.json]` command
reads only its explicit safe-relative JSON input. It does not discover or run a
project, open Tauri/Obsidian, fetch source, or publish a package.

## HTML-authoring source-comment integration

`createHtmlAuthoringSourceCommentProjectionRequest()` converts one
already-materialized HTMDoc extraction and none-only doc-source-map into a
`documentation-source-comment-projection@0.1.0-draft` request. It selects a
symbol and map entry through explicit identity, preserves canonical `@lang` /
inline `<lang>` field text, and converts HTMDoc's 1-based annotation columns to
the projection contract's 0-based columns.

```js
import { createHtmlAuthoringSourceCommentProjectionRequest } from "@hia-doc/htmdoc-runner";

const projectionRequest = createHtmlAuthoringSourceCommentProjectionRequest({
  extraction,
  docSourceMap,
  documentId: "htmdoc:card",
  symbolId: "html:component:card",
  projectionId: "projection:card:description",
  requestedLocale: "zh-CN",
  fallbackLocales: ["en"],
  contentPolicy: "explicit-projected-text"
});
```

中文说明：该 adapter 是 pure metadata bridge；它不读取源码、不运行 parser 或 core evaluator、不执行表达式，也不访问
target、Tauri/Obsidian host 或 network。ordinary doc-source-map 只提供 entry/source linkage，不承载完整 projection 或正文。

The runner writes `doc-source-map@1.1.0` and records the same exact version in
its producer-result artifact. The source-comment and metadata handoff adapters
accept both this version and historical `0.1.0-draft` inputs. They do not
promote unknown source ranges to exact positions.

## Public API and migration

See [API reference](API.md) for every exported function, constant, resource and binary, including defaults, errors, effects, source precision and publication privacy. [Migration](MIGRATION.md) describes exact legacy/current contracts. Version 1.0.0 is a source candidate; registry publication is a separate event.

## Pure metadata

```js
import { HTMDOC_RUNNER_VERSION, HTMDOC_INPUT_KINDS, HTMDOC_OUTPUT_KINDS } from "@hia-doc/htmdoc-runner/metadata";
```

This entry exposes the runner version and frozen input/output kind arrays from the same definitions used by the root API. It contains pure data definitions, with no runner execution dependencies.

中文说明。metadata子入口提供版本及冻结的输入/输出种类，根入口与该入口引用同一定义。执行构建继续使用原运行API。

## Command reference

中文。使用本地npm脚本，或 `npm exec --offline -- htmdoc --help`。帮助退出0，版本输出运行器版本；构建success退出0，partial/failed、参数或配置错误退出1。未知参数拒绝，错误使用固定安全消息。构建写出产物及生产结果清单，可能覆盖同名文件；失败或部分成功时可已有写入。

English. Use an installed npm script or `npm exec --offline -- htmdoc --help`. Help exits 0 and version prints the runner version. Successful builds exit 0; partial/failed builds and argument/config errors exit 1. Unknown options are rejected with controlled messages. Builds write artifacts and a producer result, may replace existing files, and may leave writes after a partial/failed run.

| Option | 中文 | English |
| --- | --- | --- |
| `--config/-c <file>` | 调用目录下的JSON配置 | JSON config resolved from cwd |
| `--workspace-root <dir>` | 仅直接模式，相对调用目录，默认`.` | Direct mode only, cwd-relative, default `.` |
| `--kind/-k <kind>` | 仅直接模式，html/html-fragment/html-template/custom-elements-manifest | Direct mode only, one of the four listed input kinds |
| `--out-dir/-o <dir>` | 两模式覆盖，相对工作区 | Override in both modes, workspace-relative |
| `--sources-content-policy <policy>` | 两模式覆盖，none/reference/embed，默认none | Override in both modes, none/reference/embed, default none |
| `--no-doc-source-map` | 两模式关闭地图输出，默认启用 | Disable map output in both modes, enabled by default |
| `--help/-h` | 帮助，退出0 | Help, exit 0 |
| `--version/-v` | 运行器实现版本 | Runner implementation version |
| 位置输入 / positional inputs | 仅直接模式，必填且相对工作区 | Direct mode only, required and workspace-relative |

### Config and direct modes

中文。配置workspaceRoot相对配置文件目录，默认`.`；outputDirectory相对工作区，默认dist/htmdoc。配置模式忽略workspace-root、kind和位置输入，其余三覆盖项如表所示。直接模式按文件名推断kind，亦可用kind显式覆盖。embed会将源码正文写入产物，请先确认公开许可。

English. Config workspaceRoot uses the config directory and defaults to `.`; outputDirectory is workspace-relative and defaults to dist/htmdoc. Config mode ignores workspace-root, kind, and positionals, applying the three overrides listed above. Direct mode infers kind from filenames unless explicitly supplied. Confirm publication permission before embed writes source bodies into artifacts.

保存为项目根的htmdoc.config.json，并准备获准sample.html。Save at the project root and prepare authorized sample.html.

```json
{"schemaVersion":"1.0.0","workspaceRoot":".","outputDirectory":"dist/htmdoc","inputs":[{"kind":"html","path":"sample.html"}],"options":{"sourcesContentPolicy":"none"}}
```

```sh
npm exec --offline -- htmdoc --config htmdoc.config.json
npm exec --offline -- htmdoc --workspace-root . --kind html --out-dir dist/html-direct --sources-content-policy none --no-doc-source-map sample.html
```

### Installation and version routing

中文。本页为1.0.0源码候选，候选归档须与配套内部依赖一起安装；离线安装另需第三方依赖缓存。注册表路线先用 `npm view @hia-doc/htmdoc-runner@1.0.0 version` 核目标，再核配套版本并安装。`npm list @hia-doc/htmdoc-runner --depth=0` 核本地安装。旧0.1.x配置教程按旧包阅读，当前配置身份为1.0.0。htmdoc-handoff来自同一包，其version输出交接契约身份0.1.0-draft，完整选项见随包指南。

English. This is the 1.0.0 source candidate. Install its archive with matching internal dependencies and prepare a third-party cache for offline installation. For registry installs, check the target with `npm view @hia-doc/htmdoc-runner@1.0.0 version` and verify matching dependencies first. Check the installed package with `npm list @hia-doc/htmdoc-runner --depth=0`. Older 0.1.x guides retain their package scope; current config identity is 1.0.0. htmdoc-handoff is supplied by the same package and prints handoff contract version 0.1.0-draft. Its complete options are in the bundled guide.

## Generated command help and documentation

中文。htmdoc与htmdoc-handoff采用同一字段级双语描述，分别保留八/四选项、一个HTML位置输入和不同版本身份，生成15个标准HiaDocument符号。真实宽终端使用120列帮助，其余及重定向使用80列。Node严格解析先于帮助，未知选项及缺值按原受控错误退出1。htmdoc接收位置输入，handoff拒绝位置输入。重复带值选项取最后值，合法help/version提前返回。

English. htmdoc and htmdoc-handoff use shared field-level bilingual descriptions, retaining eight/four options, one HTML positional input, and separate version identities to produce 15 standard HiaDocument symbols. Wide terminals use 120-column help, with 80 columns elsewhere and for redirection. Strict Node parsing precedes help, with unknown options and missing values exiting 1 through controlled errors. htmdoc accepts positional inputs and handoff rejects them. Repeated value options use the last value, while valid help/version return early.

中文。构建命令配置模式仅非空输出/来源策略覆盖，关闭地图标志也会应用。直接模式空输出选择工作区根，配置模式空输出保留配置。handoff默认stdout，省略或空out按stdout分支处理，非空out写明确路径且已有父目录由调用者准备。accepted与refused会输出完整报告，退出码分别为0/1，参数/文件错误走stderr。交接指南见[HANDOFF](HANDOFF.md)。

English. Build config mode applies nonempty output/source-policy overrides and the map-disabling flag. Empty direct output selects the workspace root, while empty config-mode output retains configuration. Handoff defaults to stdout, including omitted or empty out values. Nonempty out writes the selected path whose parent directory is prepared by the caller. Accepted and refused evaluations output complete reports with exit codes 0 and 1 respectively, while argument/file errors use stderr. See the bundled [handoff guide](HANDOFF.md).

The package ships seven files in `src/command-documentation/`: `description.json`, `observations.json`, `document.hia.json`, `command.schema.json`, `document.schema.json`, `help.mjs` and `generation.json`. Maintainers use `npm run commands:check` to verify actual parser declarations, original source bytes, schemas and snapshots offline. Regeneration uses `npm run commands:build -- --core-module <core-entry>`. Package-relative provenance uses scoped LF attributes and actual parser-call lines, with unknown column units and endpoints. Each CLI loads its corresponding generated help strings.

中文。开发期core严格投影，运行期使用静态帮助，日常检查复用现有Ajv。两个解析实现各自观察并绑定来源，省略的位置输入许可声明与运行行为分别核验。原包版本1.0.0与交接工件0.1.0-draft分别记录。
