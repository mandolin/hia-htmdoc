# HTML extraction to core document API

## Public exports

`assertHtmlExtractionArtifact(artifact)` validates exact supported extraction
identity/schema/profile and throws on invalid input. `htmlExtractionToHiaDocument(artifact,
options)` validates and returns a fresh HIA core document.

## Inputs

Materialized ordinary-JSON extraction, exact 0.1.0-draft or 1.0.0. Optional
`id`, `title`, `defaultLocale`, `locales` affect the core document. This adapter
does not parse source files or silently migrate input identities.

## Returns

Assertion returns void. Conversion returns core schema 0.2.0 with root,
symbols, locales, diagnostics and source provenance. Symbol kinds are retained;
i18n and supported metadata are projected. The conversion itself does not
mutate input; nested i18n/metadata may share references, so callers must not
assume later mutation of returned nested objects is isolated from the input.

## Defaults

ID `htmdoc:<source path>`, title from source basename, locale from artifact or
en. Source references link to the original relative path. Missing range falls
back only to a navigation start point and does not fabricate precise fragments.

## Errors

Unknown identity, non-JSON or invalid schema/profile input throws a fixed
TypeError. Options are trusted conversion overrides, not a complete arbitrary
core-document validator; consumers should validate the resulting core document.

## Effects

No file/network/host access or input mutation. Conversion is pure and does
not publish, fetch linked source or execute annotations.

## Compatibility

Package 1.0.0 accepts exact old/current extraction schemas. Core/source model
stays 0.2.0; source map and producer package identities remain separate.

## Source linkage

Definition positions/ranges come from extraction. Explicit embedded HTML uses
one-based UTF-16 exclusive ranges to slice exact original text, preserving CRLF
and whitespace. Invalid/empty/incomplete spans have no fragment. Caller-supplied
unproven coordinates are not independently verified against a source file.

## Privacy

Only already-provided embedded text can create fragments; default none creates
none. Documentation, diagnostics and metadata remain owner-reviewed content;
source positions do not grant permission to read files or prove redaction.
