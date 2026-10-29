# HTML extraction API

## Public exports

`extractHtmlDoc(source, options)` parses HTML and conservatively attaches
immediately preceding documentation comments. `parseHtmlDocComment(rawComment,
options)` parses a comment body alone and returns annotations, summary and i18n.

## Inputs

Explicit strings, relative `options.path`, `fragment`, `defaultLocale` and
`sourcesContentPolicy`. Comment parsing accepts the comment body rather than
HTML comment delimiters. Supported unprefixed tags are component, element,
template, attr, slot, event, stylehook, a11y, description, example and lang.
Canonical field-level `@lang` and inline `<lang>`/`<l>` provide translations.

## Returns

Extraction returns ordinary JSON: exact contract/profile identities, producer,
source, symbols, annotations, diagnostics, source-map reference, locales and
metadata. Optional undefined values are omitted. Description/lang affect text;
other mapped tags create their registered kinds. Unknown tags remain diagnosable.
The comment parser returns `{annotations,summary,i18n}`, with null for absent text.

## Defaults

Source `input.html`, document mode, locale `en` and source content `none`.
Invalid locale hints fall back to en. Symbol IDs are allocated deterministically
within one extraction; they are not a cross-edit stable identity service.

## Errors

Unsafe relative-source candidates and invalid content policies throw fixed
errors without raw values. Parser errors propagate; recoverable HTML issues
remain diagnostics. Unknown annotations are not guessed into registered kinds.

## Effects

Pure in-memory processing, no reads, writes, network or host action. The
generated extraction is consumed by the adapter, source-map builder and runner.

## Compatibility

Package 1.0.0 writes extraction/profile 1.0.0. Exact old artifact reading and
migration belong to htmdoc-spec. No arbitrary template language or implicit
template-content traversal is added; comments bind conservatively to the next node.

## Source linkage

Annotations and element ranges originate from parse5. Missing/recovered
positions remain limited. Maps are built separately; a placeholder reference
does not prove a map exists or assert cross-transform coordinate equality.

## Privacy

`none`/`reference` omit full source; explicit `embed` includes it. Documentation
prose, tag values and element attributes can still be public domain content:
owners must review the selected input rather than assuming automatic redaction.
