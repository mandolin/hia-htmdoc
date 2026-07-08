# HIA HTMDoc

HIA HTMDoc is the HTML/HTM documentation workspace for HIA.

This repository is planned as an umbrella monorepo for HTML documentation specification, parsing, extraction, HIA adapter output, Custom Elements Manifest bridging and documentation source-map linkage.

## Packages

- `@hia-doc/htmdoc-spec`: HTML documentation annotation, tag registry and rule drafts.
- `@hia-doc/html-parser`: HTML parser wrapper boundary.
- `@hia-doc/html-doc-extractor`: HTML source to HTMDoc extraction artifact.
- `@hia-doc/html-doc-adapter`: HTMDoc extraction artifact to HIA core document.
- `@hia-doc/cem-adapter`: Custom Elements Manifest to HIA bridge.
- `@hia-doc/html-doc-source-map`: HTML documentation source-map linkage.

## Status

This workspace is currently a skeleton. Runtime parser dependencies and public package publishing remain intentionally disabled until the foundation ADRs are accepted.

## Development

```sh
npm run release:gate
```
