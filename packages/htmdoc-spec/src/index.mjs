export const HTMDOC_EXTRACTION_CONTRACT = "hia-htmdoc-extraction";
export const HTMDOC_EXTRACTION_CONTRACT_VERSION = "0.1.0-draft";
export const HTMDOC_PROFILE_VERSION = "0.1.0-draft";

export const HTMDOC_SYMBOL_KINDS = Object.freeze({
  component: "html-component",
  element: "html-element",
  template: "html-template",
  attribute: "html-attribute",
  slot: "html-slot",
  event: "html-event",
  styleHook: "html-style-hook",
  a11yNote: "html-a11y-note",
  example: "html-example"
});

export const HTMDOC_TAGS = Object.freeze([
  "component",
  "element",
  "template",
  "attr",
  "slot",
  "event",
  "stylehook",
  "a11y",
  "description",
  "example",
  "lang"
]);

const TAG_TO_KIND = Object.freeze({
  component: HTMDOC_SYMBOL_KINDS.component,
  element: HTMDOC_SYMBOL_KINDS.element,
  template: HTMDOC_SYMBOL_KINDS.template,
  attr: HTMDOC_SYMBOL_KINDS.attribute,
  slot: HTMDOC_SYMBOL_KINDS.slot,
  event: HTMDOC_SYMBOL_KINDS.event,
  stylehook: HTMDOC_SYMBOL_KINDS.styleHook,
  a11y: HTMDOC_SYMBOL_KINDS.a11yNote,
  example: HTMDOC_SYMBOL_KINDS.example
});

export function getHtmlDocSymbolKind(tag) {
  return TAG_TO_KIND[tag] ?? null;
}

export function isHtmlDocTag(tag) {
  return HTMDOC_TAGS.includes(tag);
}
