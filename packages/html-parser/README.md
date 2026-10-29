# @hia-doc/html-parser

Wraps the selected HTML parser and exposes an extraction-friendly boundary without leaking parser-private ASTs to adapters.

```sh
npm install @hia-doc/html-parser
```

```js
import { parseHtml } from "@hia-doc/html-parser";

const result = parseHtml("<main>Documentation</main>");
```

The wrapper keeps parse5 private node shapes inside the parser boundary. Other
HTMDoc packages consume the stable helpers exported here rather than depending
on parse5 internals.

## Public API and migration

See [API reference](API.md) for every exported function, constant, resource and binary, including defaults, errors, effects, source precision and publication privacy. [Migration](MIGRATION.md) describes exact legacy/current contracts. Version 1.0.0 is a source candidate; registry publication is a separate event.
