# Changelog

## 0.1.0 - Unreleased

- Prepared eight MIT-licensed public package candidates with consistent npm metadata, exact internal dependency versions and dependency-first release order.
- Added real-tarball, offline consumer validation across every public package and the default source-content privacy boundary.
- Added a manually dispatched, provenance-enabled Trusted Publishing workflow that remains blocked until explicit publication approval and first-publish bootstrap resolution.
- Aligned runtime producer provenance with the `0.1.0` package candidate version.

## 0.0.0

- Added `@hia-doc/htmdoc-runner` with programmatic API, versioned JSON config/schema and `htmdoc` CLI.
- Added `@hia-doc/htmdoc-producer` for `documentation-producer@0.1.0-draft` integration.
- Added HTML/fragment/template/CEM standalone examples and direct-source doc-source-map output.
- Expanded the release gate to validate standalone output and every workspace package pack.
- Added the first HTMDoc foundation slice with parse5 parser wrapping, unprefixed annotation extraction, CEM bridge, extraction artifact output and HIA core adapter.
- Added fixture coverage and release gate tests.
- Added a W-P9.4 Web Components fixture covering CEM, HTML/template extraction, `html-event`, CSS parts/properties/states, HIA adapter output and fixture validation.
- Added an owner-local `html-authoring-documentation-handoff@0.1.0-draft` evaluator and `htmdoc-handoff` CLI for explicit none-only metadata review reports.
- Added a pure HTML-authoring source-comment projection-request adapter and bilingual owner fixture that bind structured HTMDoc comments to none-only doc-source-map entries without target or host access.
