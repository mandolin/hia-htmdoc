# HTML-authoring handoff guide

中文。本指南与两份完整请求随 `@hia-doc/htmdoc-runner` 分发。请求是本项目维护的合成元数据，说明既有交接契约。使用 Node.js `^22.23.4 || ^24.22.1`，在已安装该包的项目目录执行。

English. This guide and two complete synthetic metadata requests ship with `@hia-doc/htmdoc-runner` to illustrate the existing handoff contract. Use Node.js `^22.23.4 || ^24.22.1` and run from the project containing the installed package.

## Complete requests

- [Accepted request](examples/handoff.accepted.request.json) contains two logical entry identities and permitted metadata.
- [Unsupported-version request](examples/handoff.refused-version.request.json) supplies `0.1.1-draft` as the request version and produces a refusal.

中文。output 包含逻辑输出标识、稳定条目标识与语言，producer 包含生产器标识、版本与成功状态，conformance 为已知契约的通过摘要。docSourceMap 声明显式引用关系和 `sourcesContentPolicy: "none"`。privacy 的序列化标记与 permissions 的动作标记全部为 false。保留完整结构，再按实际获准元数据替换值。

English. output contains logical output and entry identities and locale. producer supplies identity, version, and success state. conformance is a passing summary for the known contract. docSourceMap declares explicit-reference linkage and `sourcesContentPolicy: "none"`. Every serialization flag in privacy and action flag in permissions is false. Retain the complete structure when substituting actual authorized metadata.

中文。候选包版本 1.0.0、交接契约版本 `0.1.0-draft` 与合成 producer.version `0.0.0` 各有独立含义。`htmdoc-handoff --version` 输出交接契约版本。请求按精确身份验证，升级时须协调语义和版本标签。

English. Candidate package version 1.0.0, handoff contract version `0.1.0-draft`, and synthetic producer.version `0.0.0` have independent meanings. `htmdoc-handoff --version` prints the handoff contract version. Requests require exact identity validation and coordinated semantics when upgrading.

## Run from an installed project

中文。以下命令使用本地命令，`--offline` 限定 npm 包解析。请求路径假设直接安装该包。默认在 stdout 输出 JSON。

English. These commands use the local binary and offline npm package resolution. Paths assume a direct installation of the package. JSON reports go to stdout by default.

```sh
npm exec --offline -- htmdoc-handoff --input node_modules/@hia-doc/htmdoc-runner/examples/handoff.accepted.request.json
npm exec --offline -- htmdoc-handoff --input node_modules/@hia-doc/htmdoc-runner/examples/handoff.refused-version.request.json
```

中文。第一条报告 `status: "accepted"` 并退出 0。第二条报告 `status: "refused"`，诊断码为 `HTMDOC_HTML_HANDOFF_VERSION_UNSUPPORTED`，退出 1。两者均为正常契约报告。accepted 表示所提供元数据通过校验，真实负责人审阅与采用另需证据。

English. The first reports `status: "accepted"` and exits 0. The second reports `status: "refused"`, diagnostic code `HTMDOC_HTML_HANDOFF_VERSION_UNSUPPORTED`, and exits 1. Both are normal contract reports. Accepted metadata remains subject to independent owner review and evidence of actual adoption.

## Write a report

中文。先创建报告目录，再指定输出。`--out` 的父目录须已存在，命令会写入或替换所选文件。省略该参数时向 stdout 输出报告。

English. Create the report directory before selecting an output. Its parent must exist. The command writes or replaces the selected file. Omit this option to emit the report to stdout.

```sh
node -e "require('node:fs').mkdirSync('reports',{recursive:true})"
npm exec --offline -- htmdoc-handoff --input node_modules/@hia-doc/htmdoc-runner/examples/handoff.accepted.request.json --out reports/handoff.json
```

| Option | 中文 | English |
| --- | --- | --- |
| `--input`, `-i` | 必填，请求 JSON 路径 | Required request JSON path |
| `--out`, `-o` | 可选，报告文件 | Optional report file |
| `--help`, `-h` | 帮助，退出 0 | Help, exit 0 |
| `--version`, `-v` | 交接契约版本，退出 0 | Handoff contract version, exit 0 |

中文。输入与输出相对于调用目录解析，拒绝绝对路径、URL、`..` 和空路径段。此实现仅做词法路径检查，调用者须控制目录与符号链接，确保实际文件位于获准边界。参数、JSON 读取或输出写入错误退出 1，stderr 使用固定安全消息。无法读取的输入不会产生契约报告。请检查退出码后再消费报告文件。

English. Resolve both paths from the invocation directory. Absolute paths, URLs, parent traversal, and empty segments are rejected. Checks are lexical, so callers must control directories and symbolic links to keep actual files within the authorized boundary. Argument, JSON-read, and output-write errors exit 1 with controlled stderr. Unreadable input produces no contract report. Check the exit code before consuming a report file.

中文。源码检出可在本包目录运行 `node src/html-authoring-handoff-cli.mjs --input examples/handoff.accepted.request.json`。请求排除源码、地图和 sidecar 正文及凭据。交接过程不执行目标构建、宿主集成或网络访问。正文公开和目标项目权限分别管理。

English. In a source checkout, run `node src/html-authoring-handoff-cli.mjs --input examples/handoff.accepted.request.json` from this package directory. Requests exclude source, map, and sidecar bodies and credentials. Evaluation performs no target build, host integration, or network access. Manage actual body publication and target permissions independently.

## Generated reference and terminal behavior

中文。80/120列帮助由共享双语描述生成，与15符号组合命令文档一同随包分发。执行评估要求input，help/version提前返回。严格解析拒绝未知选项与位置输入，重复值取末值。省略或空out输出stdout，非空out写既有父目录下选定文件。路径按当前词法safe-relative规则检查，JSON由正文解析，不按后缀判断。

English. Shared bilingual descriptions generate 80/120-column help and ship with the combined 15-symbol command document. Evaluation requires input, while help/version return early. Strict parsing rejects unknown options and positionals, and repeated values use the last value. Omitted or empty out writes stdout, while nonempty out selects a file under an existing parent. Current lexical safe-relative checks govern paths and JSON is parsed from the body independently of filename suffixes.
