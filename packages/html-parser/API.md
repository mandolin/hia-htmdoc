# HTML parser API

## Public exports

| Export | Responsibility |
| --- | --- |
| `parseHtml(source, options)` | parse5 document or fragment, source locator and recovery diagnostics. |
| `visitHtmlNodes(node, visitor, parent)` | Synchronous preorder walk of `childNodes`; visitor receives `(node,parent)`. |
| `isHtmlElementNode(node)` | Tests string `tagName`. |
| `isHtmlCommentNode(node)` | Tests `nodeName === "#comment"`. |
| `getHtmlNodeAttributes(node)` | Fresh name/value record from `attrs`; empty when absent. |
| `getHtmlNodeLocation(node)` | Original location reference or null. |

## Inputs

`source` is explicit HTML text. Options: safe relative `path`, optional
`fragment`. Node helpers operate on parse5-shaped nodes; traversal requires a
callable visitor. Classification accepts absent nodes. This is a parser
boundary, not an HTML execution engine or full annotation extractor.

## Returns

Parsing returns `{kind,parser,source,document,diagnostics}`. The tree can have
parent links and is not a JSON wire artifact. Recovery diagnostics carry stable
codes and locations. Attribute extraction returns a new object; location lookup
retains the parser's object reference. Classification returns booleans.

## Defaults

`path` defaults to `input.html`, document mode is default, traversal root parent
is null. parse5 location reporting is enabled. `fragment` selects parseFragment.

## Errors

Unsafe absolute/URI/drive-relative/traversal source locators throw a fixed
TypeError without the raw value. parse5 input errors and visitor exceptions
propagate. Helpers do not provide general validation of arbitrary objects.

## Effects

No file/network/host access. Parsing builds a fresh tree; helpers do not mutate
it, but caller visitors can. Traversal neither detects cycles nor implicitly
walks `template.content`; callers must choose that traversal explicitly.

## Compatibility

Package 1.0.0 pins parse5 7.3.0 and its reviewed dependency. No AST interchange
format beyond that parser boundary is promised; published old archives stay unchanged.

## Source linkage

Original locations use one-based UTF-16 columns and exclusive ends. Recovered
implicit nodes can lack locations; null is preserved instead of invented ranges.

## Privacy

Callers own the supplied source, AST and attributes. No automatic content
redaction occurs; only source-locator rejection messages are value-free.
