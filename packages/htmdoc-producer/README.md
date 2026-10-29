# @hia-doc/htmdoc-producer

Thin `documentation-producer@1.0.0` adapter for HTMDoc in the current source.

```sh
npm install @hia-doc/htmdoc-producer
```

```js
import htmdocProducer from "@hia-doc/htmdoc-producer";
```

The producer delegates to `@hia-doc/htmdoc-runner`, so standalone and HIA
project builds use the same extraction and artifact pipeline. The producer is
loaded explicitly by an HIA project; it does not scan installed modules.

`descriptor`, named `htmdocProducerDescriptor`, and the default producer refer
to the same immutable descriptor. `produce(request, context)` returns the
runner's promise and writes `documentation-producer-result@1.0.0`. Request
roots remain runtime-only absolute paths; artifacts use relative paths.
Input validation, output effects and exceptions follow `runHtmDoc()`; progress
callbacks and abort signals are delegated without wrapping. Incremental/watch
are unsupported. Importing this module does not read sources or write files.

Package versions and wire contract versions are independent. Published
`0.1.0` archives retain their original contracts. The output conformance reader
keeps exact legacy result reads and does not infer unknown-version compatibility.

## Public API and migration

See [API reference](API.md) for every exported function, constant, resource and binary, including defaults, errors, effects, source precision and publication privacy. [Migration](MIGRATION.md) describes exact legacy/current contracts. Version 1.0.0 is a source candidate; registry publication is a separate event.
