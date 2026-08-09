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
