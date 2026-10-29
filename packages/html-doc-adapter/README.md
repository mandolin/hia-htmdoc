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

## Public API and migration

See [API reference](API.md) for every exported function, constant, resource and binary, including defaults, errors, effects, source precision and publication privacy. [Migration](MIGRATION.md) describes exact legacy/current contracts. Version 1.0.0 is a source candidate; registry publication is a separate event.
