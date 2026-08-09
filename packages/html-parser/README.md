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
