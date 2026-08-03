# HIA HTMDoc

HIA HTMDoc is a standards-oriented HTML documentation toolkit. It extracts
structured documentation from HTML comments and Custom Elements Manifests,
then produces HTMDoc artifacts, HIA documents and documentation source maps.

The workspace supports two usage modes:

- standalone API and CLI for ordinary HTML projects;
- a `documentation-producer` adapter for HIA project orchestration.

## Inputs

- complete HTML documents;
- HTML fragments;
- HTML `<template>` sources;
- Custom Elements Manifest JSON.

Core annotations use unprefixed tags such as `@component`, `@template`,
`@attr`, `@slot`, `@event`, `@stylehook`, `@a11y` and `@example`.

## Standalone CLI

The packages are currently local release candidates. From a source checkout:

```sh
npm install
npm run smoke:standalone
```

The public command exposed by `@hia-doc/htmdoc-runner` is:

```sh
htmdoc --config htmdoc.config.json
```

Minimal config:

```json
{
  "schemaVersion": "0.1.0-draft",
  "workspaceRoot": ".",
  "outputDirectory": "dist/htmdoc",
  "inputs": [
    { "kind": "html", "path": "src/index.html" },
    { "kind": "custom-elements-manifest", "path": "custom-elements.json" }
  ],
  "options": {
    "emitDocSourceMap": true,
    "sourcesContentPolicy": "none"
  }
}
```

See [`examples/standalone`](examples/standalone) for all supported input kinds.

## Programmatic API

```js
import path from "node:path";
import { runHtmDoc } from "@hia-doc/htmdoc-runner";

const result = await runHtmDoc({
  workspaceRoot: process.cwd(),
  outputDirectory: path.resolve("dist/htmdoc"),
  inputs: [{ kind: "html-fragment", path: "src/card.html" }]
});
```

The result follows `documentation-producer-result@0.1.0-draft`. Artifact paths
are relative to `outputDirectory` and can be consumed without exposing runtime
absolute paths.

## HIA Producer

`@hia-doc/htmdoc-producer` exports a descriptor plus one-shot `produce()`
module. HIA project tooling loads it explicitly; standalone and integrated
builds share the same runner implementation.

```js
import htmdocProducer from "@hia-doc/htmdoc-producer";
```

## Outputs

Each successful input can produce:

- `htmdoc-extraction` JSON;
- HIA core document JSON;
- direct-source `doc-source-map` JSON.

The CLI also writes `htmdoc.producer-result.json`. Source content is not
embedded by default; `sourcesContentPolicy: "embed"` requires explicit opt-in.

For owner review of HTML-authoring documentation evidence,
`@hia-doc/htmdoc-runner` also provides an optional metadata-only handoff API
and `htmdoc-handoff` CLI. This surface accepts only `sourcesContentPolicy:
"none"` and explicit stable identity/provenance metadata; it does not read or
write a consumer project, open a desktop host, fetch source, or render a UI.

The runner also provides a pure
`createHtmlAuthoringSourceCommentProjectionRequest()` adapter. It combines an
already-materialized extraction with a none-only doc-source-map entry and emits
the neutral W-P96 projection request shape. It performs no source read, parser
execution, target/host action, or network access, and the ordinary map remains
linkage-only.

## Packages

- `@hia-doc/htmdoc-spec`: annotation registry and extraction schema.
- `@hia-doc/html-parser`: parse5 parser boundary.
- `@hia-doc/html-doc-extractor`: HTML annotation extraction.
- `@hia-doc/html-doc-adapter`: HTMDoc to HIA document adapter.
- `@hia-doc/cem-adapter`: Custom Elements Manifest bridge.
- `@hia-doc/html-doc-source-map`: direct and generated source linkage helpers.
- `@hia-doc/htmdoc-runner`: standalone API, config, CLI, metadata-only HTML-authoring handoff and source-comment projection-request adapter.
- `@hia-doc/htmdoc-producer`: HIA documentation producer adapter.

## Compatibility

- Node.js `>=20.19.0`; local development is pinned to `20.20.2` with mise.
- CI release gates cover Node 20.20.2, 22.x and 24.x.
- parse5 `7.3.0`.
- HTMDoc extraction contract `0.1.0-draft`.
- HTMDoc config schema `0.1.0-draft`.
- documentation producer contract `0.1.0-draft`.
- doc-source-map contract `0.1.0-draft`.

## Development

```sh
npm run build:fixtures
npm test
npm run release:gate
```

## License

MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for reviewed parser
dependencies.
