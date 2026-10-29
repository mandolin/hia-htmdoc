# HTML contract migration

Current source introduces config, extraction and profile `1.0.0` while keeping
exact `0.1.0-draft` reads. Package publication is a separate event: published
`0.1.0` tarballs retain their previous behavior.

## Config

```js
import { migrateHtmDocConfig } from "@hia-doc/htmdoc-runner";
const current = migrateHtmDocConfig(savedLegacyConfig);
```

Only the exact old identity is migratable. The pure function validates the
supported JSON structure, preserves every field and omission, coordinates
`schemaVersion` and an existing `$schema`, validates the target, and returns a
fresh object. Omitted directories and kind keep existing loader defaults.
Legacy schema modules and JSON resources are preserved separately; new defaults
do not retroactively change their assertions.

## Extraction and profile

```js
import { migrateHtmDocExtraction } from "@hia-doc/htmdoc-spec";
const current = migrateHtmDocExtraction(savedLegacyExtraction);
```

This validates both versions and preserves all source, symbols, annotations,
diagnostics, metadata and extensions. Only extraction/profile identities change.
New optional parent/summary fields can be null; legacy producers usually omit
absent values. Invalid old structures, unknown/current versions, cycles,
accessors and non-JSON values fail with fixed errors instead of silent loss.

New HTML and CEM writers emit the ordinary-JSON wire shape, omitting optional
`undefined` properties. Adapters, output conformance and projection requests
read exact old/new extractions. Source maps retain `1.1.0`, proven parse5 ranges
stay exclusive UTF-16, and CEM or unproven locations stay unknown. Handoff and
projection output versions remain unchanged. New descriptor/result writers
use the separately confirmed SDK `1.0.0`.

All schema resources are bundled; lookup and migration perform no file/network
I/O and do not modify input. The schema URLs identify contracts and are never
fetched during validation. No new UI, host action or CEM syntax is introduced.
