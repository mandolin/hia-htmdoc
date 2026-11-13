# HTML documentation runner API

中文。交接命令的完整示例、路径、退出码和写入说明见随包指南。
See the bundled [handoff guide](HANDOFF.md) for command examples, paths, exit codes, and writes.

## Public exports

| Export | Responsibility |
| --- | --- |
| `HTMDOC_RUNNER_VERSION`, `HTMDOC_INPUT_KINDS`, `HTMDOC_OUTPUT_KINDS` | Implementation version and supported pipeline input/output kinds. |
| `runHtmDoc(request, context)` | One-shot validated HTML/CEM generation and result delivery. |
| `loadHtmDocConfig(configPath, options)` | Explicit JSON read and exact old/current config normalization. |
| `inferHtmDocInputKind(inputPath)` | Filename inference only, no path validation or I/O. |
| `HTMDOC_CONFIG_JSON_SCHEMA`, `HTMDOC_CONFIG_SCHEMA_ID`, `HTMDOC_CONFIG_SCHEMA_VERSION` | Current config definitions. |
| `HTMDOC_LEGACY_CONFIG_JSON_SCHEMA`, `HTMDOC_LEGACY_CONFIG_SCHEMA_ID`, `HTMDOC_LEGACY_CONFIG_SCHEMA_VERSION` | Original historical config definitions. |
| `getHtmDocConfigSchema(identity)`, `migrateHtmDocConfig(value)` | Exact query and explicit pure lossless migration. |
| `createHtmlAuthoringDocumentationHandoff(request)` | Pure metadata-only accepted/refused handoff evaluator. |
| `HTML_AUTHORING_DOCUMENTATION_HANDOFF_CONTRACT`, `HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION`, `HTML_AUTHORING_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES` | Separate frozen handoff report identity and safe codes. |
| `createHtmlAuthoringSourceCommentProjectionRequest(value)` | Pure materialized-extraction/map to source-comment request adapter. |

Explicit JSON subpaths: `./schemas/htmdoc-config-1.0.0.schema.json` and
`./schemas/htmdoc-config-0.1.0-draft.schema.json`. Binaries: `htmdoc` and
`htmdoc-handoff`; neither performs automatic plugin/target discovery.

## Inputs

Runtime request has absolute workspaceRoot/outputDirectory, nonempty inputs
with safe relative path and optional kind/language, options and profileIds.
Context supplies signal and synchronous reportProgress callback. Loader options
allow cwd for resolving the explicit config path. Handoff accepts only explicit
stable metadata, approved conformance/permission and none policy. Projection
accepts materialized extraction/map, explicit identities, locales and content
policy; see README for their closed request fields.

## Returns

Runner Promise resolves producer-result with success/partial/failed, relative
artifacts and diagnostics. Loader Promise resolves an in-memory request.
Inference returns a kind; schema query returns read-only definition/undefined.
Migration returns a fresh config with preserved values/omissions. Handoff
returns content-free accepted/refused. Projection returns a neutral bounded
documentation-source-comment-projection request without executing it.

## Defaults

Config workspaceRoot `.`, outputDirectory `dist/htmdoc`, omitted kind inferred
from custom-elements.json/.template.html/.fragment.html suffixes, else html.
profileIds `["htmdoc"]`; map and result-manifest booleans true; content none.
Profile IDs are unique lower-case identifiers; explicit null is not omission.
Legacy schema keeps its original required fields; old loader defaults remain
compatible without relabeling or rewriting that schema.

## Errors

Declared invalid types/paths/duplicates fail before output creation. Per-input
conversion failures become safe diagnostics and later inputs continue.
Output-root/manifest I/O and callback exceptions propagate. Loader read/JSON
failures are fixed TypeError. Both CLIs catch argument parsing and avoid raw
argv/JSON/path/stack echoes; failures exit nonzero. Migration rejects unknown or
current identity/non-JSON with fixed errors. Handoff refusals are normal report
states; invalid projection structure throws fixed TypeError.

## Effects

Runner reads explicitly selected inputs, creates directories and writes
extraction/core/map plus optional manifest. It does not delete prior outputs,
roll back partial writes, watch or run incrementally. Abort stops future work,
not prior effects. Loader reads its chosen config. Migration/query/handoff/
projection perform no file/network/host action. Handoff CLI reads one explicit
metadata JSON and optionally writes its report; it never discovers a target.

## Compatibility

Package 1.0.0, current config/extraction/profile and descriptor/result 1.0.0,
exact legacy reads and explicit migration. Map remains 1.1.0; handoff and
source-comment projection outputs stay 0.1.0-draft. All package archive resources
are bundled; no schema URL is fetched. Node.js 22/24 support follows engines.

## Source linkage

Runner registers the actual map version, paths and selectors. Proven parse5
ranges retain exclusive UTF-16; CEM/unproven positions remain unknown. A
projection request is a request, not proof of cross-map same-point coordinates
or permission to read/write source or invoke a host.

## Privacy

Runtime roots stay in memory; artifacts use relative locators. Explicit embed
is opt-in; none/reference omit full source. Owner-selected documentation,
attributes and CEM metadata still require publication review. Lexical relative
paths are not symlink sandbox guarantees. Callbacks are trusted caller code.

## Pure metadata entry

Subpath `./metadata` exports `HTMDOC_RUNNER_VERSION`, `HTMDOC_INPUT_KINDS` and `HTMDOC_OUTPUT_KINDS` from pure definitions. The arrays are frozen, and the root API exposes the same references. This entry performs no runner operations.

中文说明。metadata子入口提供同一版本与冻结输入/输出种类，适用于发现和文档工具。声明分支与运行分支分别提供，构建使用原运行API。

## Command documentation assets

The `src/command-documentation/` directory ships two command descriptions, their independent actual parser observations, standard HiaDocument, self-contained schemas, static help and a generation receipt. htmdoc displays its runner version, while htmdoc-handoff displays the handoff artifact version. Package-relative source digests and line-only anchors are retained for each implementation.

中文。两个实现分别保留实际声明、版本及来源，同一字段内容驱动帮助和标准文档，列单位及终点未知。
