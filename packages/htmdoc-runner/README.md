# @hia-doc/htmdoc-runner

Standalone API and CLI for HTML documentation projects.

```sh
npm install --save-dev @hia-doc/htmdoc-runner
```

JSON configs use `schemaVersion: "0.1.0-draft"`. The package exports
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

```sh
htmdoc --config htmdoc.config.json
```

Source content is not embedded unless `sourcesContentPolicy: "embed"` is set
explicitly in the config `options` object.

## HTML-authoring metadata handoff

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
