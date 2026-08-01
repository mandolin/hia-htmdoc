# HTMDoc Spec

Defines draft annotation, tag registry, rule, diagnostic and compatibility semantics for HTML documentation.

The current tag registry includes standard-level, unprefixed tags for components, elements, templates, attributes, slots, events, style hooks, accessibility notes, examples, descriptions and language metadata.

The package also exports the draft extraction artifact schema constants:

- `HTMDOC_EXTRACTION_SCHEMA_ID`
- `HTMDOC_EXTRACTION_JSON_SCHEMA`

It also exports the owner-local `evaluateHtmDocOutputConformance()` evaluator and its
`HTMDOC_OUTPUT_CONFORMANCE_*` constants. The evaluator compares already-generated extraction, HIA document,
ordinary doc-source-map and producer-result JSON records. It performs no file, source, network or target-project
access, and is not a cross-package runtime capability schema. The default `none` source-content policy remains
content-free; an `embed` artifact requires explicit evaluator confirmation.
