export const HTML_DOC_SOURCE_CONTENT_POLICIES = Object.freeze(["none", "reference", "embed"]);

export function createHtmlDocSourceMapRef(options = {}) {
  return {
    kind: "hia-doc-source-map-ref",
    href: options.href ?? null,
    sourcesContentPolicy: normalizeSourcesContentPolicy(options.sourcesContentPolicy ?? "none")
  };
}

export function normalizeSourcesContentPolicy(policy) {
  if (!HTML_DOC_SOURCE_CONTENT_POLICIES.includes(policy)) {
    throw new Error(`Unsupported HTMDoc sourcesContent policy: ${policy}`);
  }
  return policy;
}
