# HTML documentation specification API

## Public exports

| Export | Responsibility |
| --- | --- |
| `HTMDOC_EXTRACTION_CONTRACT`, `HTMDOC_EXTRACTION_CONTRACT_VERSION`, `HTMDOC_EXTRACTION_SCHEMA_ID`, `HTMDOC_EXTRACTION_JSON_SCHEMA` | Current exact extraction identity/schema. |
| `HTMDOC_PROFILE_VERSION`, `HTMDOC_SYMBOL_KINDS`, `HTMDOC_TAGS` | Current profile and supported kinds/tags; description/lang are text tags. |
| `HTMDOC_LEGACY_EXTRACTION_CONTRACT_VERSION`, `HTMDOC_LEGACY_EXTRACTION_SCHEMA_ID`, `HTMDOC_LEGACY_EXTRACTION_JSON_SCHEMA`, `HTMDOC_LEGACY_PROFILE_VERSION` | Exact preserved historical definitions. |
| `getHtmlDocSymbolKind(tag)`, `isHtmlDocTag(tag)` | Case-sensitive own registry lookup and registration test. |
| `getHtmDocExtractionSchema(identity)` | Exact version/schema-ID lookup; unknown returns undefined. |
| `validateHtmDocExtraction(value)` | Pure ordinary-JSON/schema/profile validation, fixed diagnostics. |
| `migrateHtmDocExtraction(value)` | Explicit validated lossless old-to-current JSON migration. |
| `evaluateHtmDocOutputConformance(bundle, options)` | Pure owner-local generated-output consistency check. |
| `HTMDOC_OUTPUT_CONFORMANCE_CONTRACT`, `HTMDOC_OUTPUT_CONFORMANCE_VERSION`, `HTMDOC_OUTPUT_CONFORMANCE_CODES` | Separate frozen owner-local report identity/codes. |

JSON resources are explicit subpaths:

- `./schemas/hia-htmdoc-extraction-1.0.0.schema.json`
- `./schemas/hia-htmdoc-extraction-0.1.0-draft.schema.json`

## Inputs

Canonical lowercase tag strings; exact version or schema ID for lookup;
ordinary JSON extraction for validation/migration. Conformance bundle fields
are extraction, document, docSourceMap and producerResult. Its only option is
explicit boolean `allowEmbeddedSource`; metadata alone cannot grant embed permission.

## Returns

Kind string/null, registration boolean, corresponding read-only schema data or
undefined. Validation returns an empty array or fixed error diagnostics.
Migration returns a fresh JSON object preserving all data/extensions except
coordinated contract/profile identities. Conformance returns a content-free
`{contract,contractVersion,conformant,violations}` report.

## Defaults

No unknown-version inference or automatic migration. Conformance refuses
embedded source unless explicitly allowed. Schema objects are shared definitions
and must be treated as read-only. Helpers do not lowercase caller tags.

## Errors

Migration throws fixed TypeError for invalid, current or unknown versions,
cycles, accessors, sparse arrays and non-JSON values. Validation converts
failures to fixed diagnostics. Registry lookup rejects inherited object keys.
Conformance records violations rather than fetching or repairing artifacts.

## Effects

No filesystem/network/host access, no input mutation or remote schema loading.
Ajv validates bundled definitions without coercion/default insertion/removal.
Writers use these identities, adapters check them, and runner delivery metadata
must agree with the actual map version.

## Compatibility

Package/current extraction/profile 1.0.0. Exact 0.1.0-draft schema modules and
resources remain preserved. Nullable parent/summary are new current rules, not
changes to historical definitions. Output-conformance report stays 0.1.0-draft;
it reads exact old/current producer results and old/current ordinary maps.

## Source linkage

Conformance checks metadata continuity and declared per-reference conventions.
It is not the general shared map validator and does not prove byte identity,
source authorization, file existence or cross-transform coordinate equality.

## Privacy

Validation/conformance failures contain fixed producer messages. Domain prose,
metadata and explicit embedded content remain owner-reviewed. Schemas are
identity data; their URLs are never fetched by these APIs.
