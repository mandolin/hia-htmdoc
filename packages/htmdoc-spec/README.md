# @hia-doc/htmdoc-spec

Defines annotation, tag registry, rule, diagnostic and compatibility semantics for the supported HTML documentation subset.

```sh
npm install @hia-doc/htmdoc-spec
```

```js
import {
  HTMDOC_EXTRACTION_CONTRACT,
  HTMDOC_EXTRACTION_JSON_SCHEMA
} from "@hia-doc/htmdoc-spec";
```

The current tag registry includes standard-level, unprefixed tags for components, elements, templates, attributes, slots, events, style hooks, accessibility notes, examples, descriptions and language metadata.

The current source exports the extraction `1.0.0` schema constants:

- `HTMDOC_EXTRACTION_SCHEMA_ID`
- `HTMDOC_EXTRACTION_JSON_SCHEMA`

It also exports the owner-local `evaluateHtmDocOutputConformance()` evaluator and its
`HTMDOC_OUTPUT_CONFORMANCE_*` constants. The evaluator compares already-generated extraction, HIA document,
ordinary doc-source-map and producer-result JSON records. It performs no file, source, network or target-project
access, and is not a cross-package runtime capability schema. The default `none` source-content policy remains
content-free; an `embed` artifact requires explicit evaluator confirmation.
Its owner-local output gate accepts exact `doc-source-map@1.1.0` and historical
`0.1.0-draft` identities. Current ranged references must carry a valid
`rangeConvention`, and the producer-result map version must match the delivered
map. Full general map validation remains the responsibility of the shared
schema and reader.

## Exact versions and lossless migration

Current source `hia-htmdoc-extraction` and its profile use `1.0.0`; the exact
`0.1.0-draft` schema remains under `HTMDOC_LEGACY_EXTRACTION_*` and the original
module archive. New optional `parentId` and `summary` permit `null`; this is an
explicit new rule, while ordinary current producers usually omit absent values.
The legacy schema is not rewritten. Package versions remain independent of
these artifact identities.

`getHtmDocExtractionSchema(versionOrId)` returns the exact schema or
`undefined` for an unknown identity. `validateHtmDocExtraction(value)` accepts
ordinary JSON with exact contract/profile identities and the corresponding
schema. It returns an empty diagnostic array when valid; otherwise it returns
only a fixed public-safe error, without echoing Ajv details or caller values.

`migrateHtmDocExtraction(oldArtifact)` validates the exact old structure,
copies the entire JSON value, coordinates contract/profile versions, and
validates the target. Extensions and omitted fields are preserved. It returns
a new object and throws a fixed `TypeError` for current/unknown identities,
invalid structures, cycles, accessors, sparse arrays and non-JSON data rather
than silently deleting or relabeling them. No API reads a file, source, URL or
network; bundled Ajv validation uses no coercion, default insertion or removal.

The bundled JSON subpaths are
`@hia-doc/htmdoc-spec/schemas/hia-htmdoc-extraction-1.0.0.schema.json` and
`hia-htmdoc-extraction-0.1.0-draft.schema.json`. Conformance and the projection
adapter accept exact legacy/current extraction inputs; their own output
contract identities remain unchanged. This does not expand the supported HTML
syntax or CEM subset.
