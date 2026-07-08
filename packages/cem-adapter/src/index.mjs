import {
  HTMDOC_EXTRACTION_CONTRACT,
  HTMDOC_EXTRACTION_CONTRACT_VERSION,
  HTMDOC_PROFILE_VERSION,
  HTMDOC_SYMBOL_KINDS
} from "@hia-doc/htmdoc-spec";

export function cemManifestToHtmlExtraction(manifest, options = {}) {
  const sourcePath = normalizeSourcePath(options.path ?? "custom-elements.json");
  const symbols = [];
  const diagnostics = [];
  const usedIds = new Set();

  for (const moduleEntry of manifest?.modules ?? []) {
    for (const declaration of moduleEntry.declarations ?? []) {
      if (!declaration?.tagName) {
        continue;
      }
      const componentId = allocateId(`cem:component:${slug(declaration.tagName)}`, usedIds);
      symbols.push({
        id: componentId,
        kind: HTMDOC_SYMBOL_KINDS.component,
        name: declaration.tagName,
        summary: declaration.description || declaration.summary || undefined,
        source: createCemSource(sourcePath),
        metadata: {
          origin: "custom-elements-manifest",
          modulePath: moduleEntry.path ?? null,
          declarationName: declaration.name ?? null
        }
      });

      for (const attr of declaration.attributes ?? []) {
        symbols.push(createChildSymbol("attr", HTMDOC_SYMBOL_KINDS.attribute, attr.name, attr.description, componentId, sourcePath, usedIds));
      }
      for (const slot of declaration.slots ?? []) {
        symbols.push(createChildSymbol("slot", HTMDOC_SYMBOL_KINDS.slot, slot.name || "default", slot.description, componentId, sourcePath, usedIds));
      }
      for (const cssPart of declaration.cssParts ?? []) {
        symbols.push(createChildSymbol("stylehook", HTMDOC_SYMBOL_KINDS.styleHook, `::part(${cssPart.name})`, cssPart.description, componentId, sourcePath, usedIds));
      }
      for (const cssProperty of declaration.cssProperties ?? []) {
        symbols.push(createChildSymbol("stylehook", HTMDOC_SYMBOL_KINDS.styleHook, cssProperty.name, cssProperty.description, componentId, sourcePath, usedIds));
      }
    }
  }

  if (symbols.length === 0) {
    diagnostics.push({
      code: "HTMDOC_CEM_NO_CUSTOM_ELEMENTS",
      message: "Custom Elements Manifest did not contain declarations with tagName.",
      severity: "warning",
      path: sourcePath
    });
  }

  return {
    contract: HTMDOC_EXTRACTION_CONTRACT,
    contractVersion: HTMDOC_EXTRACTION_CONTRACT_VERSION,
    producer: {
      name: "@hia-doc/cem-adapter",
      version: "0.0.0"
    },
    profile: {
      name: "custom-elements-manifest",
      version: HTMDOC_PROFILE_VERSION
    },
    source: {
      kind: "custom-elements-manifest",
      path: sourcePath,
      schemaVersion: manifest?.schemaVersion ?? null
    },
    symbols,
    annotations: [],
    diagnostics,
    sourceMap: {
      kind: "hia-doc-source-map-ref",
      href: null,
      sourcesContentPolicy: "none"
    },
    metadata: {
      schemaVersion: manifest?.schemaVersion ?? null
    }
  };
}

function createChildSymbol(tag, kind, name, summary, parentId, sourcePath, usedIds) {
  return {
    id: allocateId(`cem:${tag}:${slug(parentId)}:${slug(name)}`, usedIds),
    kind,
    name,
    parentId,
    summary: summary || undefined,
    source: createCemSource(sourcePath),
    metadata: {
      origin: "custom-elements-manifest",
      tag
    }
  };
}

function createCemSource(sourcePath) {
  return {
    path: sourcePath,
    range: {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 }
    }
  };
}

function allocateId(baseId, usedIds) {
  let id = baseId;
  let index = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }
  usedIds.add(id);
  return id;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}

function normalizeSourcePath(sourcePath) {
  const normalized = String(sourcePath).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe CEM source path: ${sourcePath}`);
  }
  return normalized;
}
