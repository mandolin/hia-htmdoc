# Custom Elements Manifest adapter API

## Public exports

`cemManifestToHtmlExtraction(manifest, options)` maps materialized Custom
Elements Manifest JSON to the confirmed HTML-facing extraction subset.

## Inputs

CEM modules/declarations with tagName, relative `options.path`. Attributes,
slots, events, CSS parts/properties/states and demos map to child symbols;
JavaScript members/methods remain metadata. Module paths are metadata, never
instructions to discover or execute files. This is not a full CEM schema validator.

## Returns

Ordinary extraction/profile 1.0.0 JSON with producer, source, symbols,
annotations, diagnostics, reference and metadata. Missing optional values are
omitted. No custom-element declarations yields a warning and empty symbols.
Child IDs are allocated deterministically within the conversion.

## Defaults

Source locator `custom-elements.json`, default slot name `default`, source
content policy none. Summary prefers a supplied summary, then description.

## Errors

Unsafe source locators throw fixed TypeError without raw values. Unsupported
input shapes can throw; optional missing module arrays are treated as empty.
No future CEM schema/version compatibility is inferred from the producer package version.

## Effects

No filesystem/network/host access or JavaScript execution. New output JSON is
returned; caller JSON is not intentionally modified. Runner converts it to core
documents and source maps through the same downstream adapters as HTML.

## Compatibility

Package 1.0.0 retains the established HTML-facing subset; no new JS property
or method symbol kinds are introduced. Old artifacts use explicit spec migration.

## Source linkage

The synthetic 1:1 location is a linkage placeholder, not actual CEM source
coordinates. Maps keep unknown units/end boundaries and low confidence.

## Privacy

No source file is read or embedded. Caller-provided documentation and metadata
are retained, including module/member/demos data; owners must approve them for publication.
