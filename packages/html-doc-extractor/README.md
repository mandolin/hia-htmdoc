# @hia-doc/html-doc-extractor

Extracts documentation symbols, annotations, diagnostics and source references from HTML sources.

```sh
npm install @hia-doc/html-doc-extractor
```

```js
import { extractHtmlDoc } from "@hia-doc/html-doc-extractor";

const artifact = extractHtmlDoc(htmlSource, {
  path: "src/card.html",
  sourcesContentPolicy: "none"
});
```

The default `none` policy records safe relative linkage without embedding the
input body. Parsing resolves documentation annotations; it does not execute
HTML, script or expression content.
