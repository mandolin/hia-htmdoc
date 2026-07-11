# HTML Doc Source Map

Creates safe documentation source-map references and direct-source manifests
for HTMDoc extraction artifacts.

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
