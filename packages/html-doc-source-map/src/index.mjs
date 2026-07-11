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

export function createHtmlDocumentationSourceMap(options = {}) {
  const extraction = options.extraction;
  if (!extraction || extraction.contract !== "hia-htmdoc-extraction") {
    throw new Error("Expected hia-htmdoc-extraction artifact.");
  }

  const extractionPath = normalizeSafePath(options.extractionPath ?? "document.htmdoc.json");
  const hiaDocumentPath = normalizeSafePath(options.hiaDocumentPath ?? "document.hia.json");
  const sourcePath = normalizeSafePath(extraction.source?.path ?? "input.html");
  const sourceLanguage = extraction.source?.kind === "custom-elements-manifest" ? "json" : "html";
  const sourceId = `source:${sourceLanguage}:${slug(sourcePath)}`;
  const extractionArtifactId = "artifact:htmdoc:extraction";
  const hiaArtifactId = "artifact:hia:document";
  const entryIds = extraction.symbols.map((symbol) => `entry:${slug(symbol.id)}`);
  const sourcesContentPolicy = normalizeSourcesContentPolicy(
    options.sourcesContentPolicy ?? extraction.sourceMap?.sourcesContentPolicy ?? "none"
  );

  return {
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    id: options.id ?? `docmap:htmdoc:${slug(sourcePath)}`,
    producer: {
      name: "@hia-doc/html-doc-source-map",
      version: "0.0.0",
      runtime: "node",
      profile: "htmdoc-direct-source"
    },
    pathBases: {
      artifacts: "outputDirectory",
      sources: "workspaceRoot"
    },
    artifacts: [
      {
        id: extractionArtifactId,
        kind: "extraction-artifact",
        path: extractionPath,
        language: "json",
        role: "generated",
        contractRefs: [{
          contract: extraction.contract,
          contractVersion: extraction.contractVersion,
          path: extractionPath
        }]
      },
      {
        id: hiaArtifactId,
        kind: "hia-document",
        path: hiaDocumentPath,
        language: "json",
        role: "generated"
      }
    ],
    sources: [{
      id: sourceId,
      kind: extraction.source?.kind ?? "html",
      path: sourcePath,
      language: sourceLanguage,
      role: "original",
      sourcesContentPolicy
    }],
    sourceMaps: [],
    chains: [{
      id: `chain:htmdoc:${slug(sourcePath)}`,
      stages: [
        {
          from: sourceId,
          to: extractionArtifactId,
          transform: extraction.source?.kind === "custom-elements-manifest" ? "cem-to-htmdoc" : "html-to-htmdoc",
          sourceMap: null,
          linkage: entryIds
        },
        {
          from: extractionArtifactId,
          to: hiaArtifactId,
          transform: "htmdoc-to-hia-core",
          sourceMap: null,
          linkage: entryIds
        }
      ]
    }],
    entries: extraction.symbols.map((symbol, index) => ({
      id: entryIds[index],
      kind: "symbol",
      symbolId: symbol.id,
      symbolKind: symbol.kind,
      ...(symbol.metadata?.tag
        ? { annotation: { tag: symbol.metadata.tag, value: symbol.metadata.value ?? "" } }
        : {}),
      sourceRefs: [{
        sourceId,
        range: symbol.source?.range ?? undefined,
        rangeSource: extraction.source?.kind === "custom-elements-manifest" ? "adapter" : "parser",
        confidence: symbol.source?.range ? "high" : "medium"
      }],
      artifactRefs: [
        {
          artifactId: extractionArtifactId,
          selector: `/symbols/${index}`,
          rangeSource: "adapter",
          confidence: "high"
        },
        {
          artifactId: hiaArtifactId,
          selector: `/symbols/${index}`,
          rangeSource: "adapter",
          confidence: "high"
        }
      ],
      diagnostics: []
    })),
    privacy: {
      sourcesContentPolicy,
      allowAbsolutePaths: false,
      allowUncPaths: false,
      allowPathTraversal: false,
      releaseGate: {
        requireExplicitEmbedOptIn: true,
        failOnUnsafePath: true,
        failOnUnexpectedSourcesContent: true
      }
    },
    diagnostics: []
  };
}

function normalizeSafePath(value) {
  const normalized = String(value).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe doc-source-map path: ${value}`);
  }
  return normalized;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}
