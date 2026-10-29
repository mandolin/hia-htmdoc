# HTML Doc Source Map

Creates safe documentation source-map references and direct-source manifests
for HTMDoc extraction artifacts.

```sh
npm install @hia-doc/html-doc-source-map
```

```js
import { createHtmlDocumentationSourceMap } from "@hia-doc/html-doc-source-map";

const manifest = createHtmlDocumentationSourceMap({
  extraction,
  extractionPath: "artifacts/card.htmdoc.json",
  hiaDocumentPath: "artifacts/card.hia.json"
});
```

Source paths are workspace-relative, artifact paths are output-relative and
source content is not embedded by default.

The source checkout emits `doc-source-map@1.1.0`. Each ranged `sourceRef`
includes `rangeConvention` with `endBoundary` and `columnUnit`. Proven parse5
HTML element ranges use `exclusive` and `utf16-code-unit`. The synthetic `1:1`
positions from Custom Elements Manifest, parser recovery paths and unverified
origins use `unknown` for both fields; consumers should treat them as source
relations rather than exact cursor positions. A source reference without a
range has no `rangeConvention`.

## Public API and migration

See [API reference](API.md) for every exported function, constant, resource and binary, including defaults, errors, effects, source precision and publication privacy. [Migration](MIGRATION.md) describes exact legacy/current contracts. Version 1.0.0 is a source candidate; registry publication is a separate event.
