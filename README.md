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

This workspace contains the first HTMDoc foundation slice:

- a parse5-backed HTML parser boundary;
- unprefixed HTMDoc annotation extraction;
- a Custom Elements Manifest bridge;
- Web Components fixture generation for CEM and HTML/template inputs;
- a draft `hia-htmdoc-extraction@0.1.0` artifact shape;
- a HIA core document adapter.

Packages remain private until the public package naming and release sequence are finalized.

## Development

```sh
npm run build:fixtures
npm run check:fixtures
npm run release:gate
```
