# @hia-doc/htmdoc-producer

Thin `documentation-producer@0.1.0-draft` adapter for HTMDoc.

```sh
npm install @hia-doc/htmdoc-producer
```

```js
import htmdocProducer from "@hia-doc/htmdoc-producer";
```

The producer delegates to `@hia-doc/htmdoc-runner`, so standalone and HIA
project builds use the same extraction and artifact pipeline. The producer is
loaded explicitly by an HIA project; it does not scan installed modules.
