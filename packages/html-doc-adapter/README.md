# @hia-doc/html-doc-adapter

Converts HTMDoc extraction artifacts into HIA core documents.

```sh
npm install @hia-doc/html-doc-adapter
```

```js
import { htmlExtractionToHiaDocument } from "@hia-doc/html-doc-adapter";

const document = htmlExtractionToHiaDocument(extraction, {
  id: "htmdoc:card",
  title: "Card"
});
```

The adapter accepts the neutral HTMDoc extraction artifact and does not read
source files, invoke a parser or perform host operations.
