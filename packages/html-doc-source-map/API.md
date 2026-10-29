# HTML documentation source-map API

## Public exports

| Export | Responsibility |
| --- | --- |
| `HTML_DOC_SOURCE_CONTENT_POLICIES` | Frozen none/reference/embed list. |
| `normalizeSourcesContentPolicy(policy)` | Exact enum check, returns the same supported string. |
| `createHtmlDocSourceMapRef(options)` | Pure placeholder reference, not a generated map. |
| `createHtmlDocumentationSourceMap(options)` | Builds an ordinary map from an existing extraction and relative output paths. |

## Inputs

Reference options: optional href and content policy. Map options: materialized
`extraction`, `extractionPath`, `hiaDocumentPath`, optional `id` and policy.
The map builder requires the exact old/current extraction contract identity;
full extraction schema checking belongs to spec/adapter, not this lightweight helper.

## Returns

Reference `{kind,href,sourcesContentPolicy}`; href can be null. A map contains
producer, pathBases, artifacts, sources, chains, symbol entries, privacy and
diagnostics. Each symbol links extraction/core selectors to the original source.

## Defaults

Reference href null, policy none. Output paths document.htmdoc.json and
document.hia.json. Map policy can inherit the extraction reference. IDs derive
deterministically from relative paths/symbols unless supplied explicitly.

## Errors

Unknown policy and unsafe paths produce fixed TypeError without raw values.
Wrong/unknown extraction identity or unsupported input structure throws.
Inputs must be materialized records; this helper does not parse arbitrary maps.

## Effects

No filesystem/network/host access. It returns a new map and does not copy source
content into map records. The runner writes the map and registers its exact version.

## Compatibility

Package 1.0.0 writes doc-source-map 1.1.0, accepting exact extraction
0.1.0-draft/1.0.0. It does not promote handoff or coordinate-profile capabilities.

## Source linkage

Only the known parse5 HTML branch without recovery diagnostics and with complete
columns claims exclusive UTF-16 ranges. CEM placeholders and unproven branches
retain unknown conventions. File existence, transformed-map same-point evidence
and symbol identity across edits are not verified here.

## Privacy

Paths are lexical safe-relative locators, not filesystem sandbox proof. No
source is read; content policy is metadata, not permission. Documentation/tag
values and caller IDs are domain content that requires owner review.
