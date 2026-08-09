import {
  HTMDOC_EXTRACTION_CONTRACT,
  HTMDOC_EXTRACTION_CONTRACT_VERSION,
  HTMDOC_PROFILE_VERSION,
  HTMDOC_SYMBOL_KINDS
} from "@hia-doc/htmdoc-spec";

// <lang><zh-CN>产物 provenance 使用公开候选包版本，并与 package.json 的精确版本保持同步。</zh-CN><en>Artifact provenance uses the public candidate package version and stays aligned with the exact package.json version.</en></lang>
const CEM_ADAPTER_VERSION = "0.1.0";

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
        summary: summaryFrom(declaration),
        source: createCemSource(sourcePath),
        metadata: {
          origin: "custom-elements-manifest",
          modulePath: moduleEntry.path ?? null,
          declarationName: declaration.name ?? null,
          customElement: declaration.customElement ?? true,
          superclass: declaration.superclass ?? null,
          status: declaration.status ?? null,
          deprecated: declaration.deprecated ?? null,
          exports: findCustomElementExports(moduleEntry, declaration),
          javascript: {
            members: summarizeMembers(declaration.members),
            methods: summarizeMembers(declaration.methods)
          }
        }
      });

      for (const attr of declaration.attributes ?? []) {
        symbols.push(createChildSymbol({
          tag: "attr",
          kind: HTMDOC_SYMBOL_KINDS.attribute,
          name: attr.name,
          summary: summaryFrom(attr),
          parentId: componentId,
          sourcePath,
          usedIds,
          metadata: {
            fieldName: attr.fieldName ?? null,
            type: typeText(attr.type),
            default: attr.default ?? null
          }
        }));
      }
      for (const slot of declaration.slots ?? []) {
        symbols.push(createChildSymbol({
          tag: "slot",
          kind: HTMDOC_SYMBOL_KINDS.slot,
          name: slot.name || "default",
          summary: summaryFrom(slot),
          parentId: componentId,
          sourcePath,
          usedIds
        }));
      }
      for (const event of declaration.events ?? []) {
        symbols.push(createChildSymbol({
          tag: "event",
          kind: HTMDOC_SYMBOL_KINDS.event,
          name: event.name,
          summary: summaryFrom(event),
          parentId: componentId,
          sourcePath,
          usedIds,
          metadata: {
            type: typeText(event.type)
          }
        }));
      }
      for (const cssPart of declaration.cssParts ?? []) {
        symbols.push(createChildSymbol({
          tag: "stylehook",
          kind: HTMDOC_SYMBOL_KINDS.styleHook,
          name: `::part(${cssPart.name})`,
          summary: summaryFrom(cssPart),
          parentId: componentId,
          sourcePath,
          usedIds,
          metadata: {
            styleHookKind: "css-part",
            cssName: cssPart.name
          }
        }));
      }
      for (const cssProperty of declaration.cssProperties ?? []) {
        symbols.push(createChildSymbol({
          tag: "stylehook",
          kind: HTMDOC_SYMBOL_KINDS.styleHook,
          name: cssProperty.name,
          summary: summaryFrom(cssProperty),
          parentId: componentId,
          sourcePath,
          usedIds,
          metadata: {
            styleHookKind: "css-custom-property",
            syntax: cssProperty.syntax ?? null,
            type: typeText(cssProperty.type),
            default: cssProperty.default ?? null
          }
        }));
      }
      for (const cssState of declaration.cssStates ?? []) {
        symbols.push(createChildSymbol({
          tag: "stylehook",
          kind: HTMDOC_SYMBOL_KINDS.styleHook,
          name: `:state(${cssState.name})`,
          summary: summaryFrom(cssState),
          parentId: componentId,
          sourcePath,
          usedIds,
          metadata: {
            styleHookKind: "css-state",
            cssName: cssState.name
          }
        }));
      }
      for (const demo of declaration.demos ?? []) {
        symbols.push(createChildSymbol({
          tag: "demo",
          kind: HTMDOC_SYMBOL_KINDS.example,
          name: demo.url ?? demo.description ?? `${declaration.tagName} demo`,
          summary: summaryFrom(demo),
          parentId: componentId,
          sourcePath,
          usedIds,
          metadata: {
            url: demo.url ?? null
          }
        }));
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
      version: CEM_ADAPTER_VERSION
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

function createChildSymbol({ tag, kind, name, summary, parentId, sourcePath, usedIds, metadata = {} }) {
  return {
    id: allocateId(`cem:${tag}:${slug(parentId)}:${slug(name)}`, usedIds),
    kind,
    name,
    parentId,
    summary: summary || undefined,
    source: createCemSource(sourcePath),
    metadata: {
      origin: "custom-elements-manifest",
      tag,
      ...metadata
    }
  };
}

function findCustomElementExports(moduleEntry, declaration) {
  return (moduleEntry.exports ?? [])
    .filter((exportEntry) => exportEntry.kind === "custom-element-definition")
    .filter((exportEntry) => exportEntry.name === declaration.tagName || exportEntry.declaration?.name === declaration.name)
    .map((exportEntry) => ({
      name: exportEntry.name ?? null,
      declaration: exportEntry.declaration ?? null
    }));
}

function summarizeMembers(members = []) {
  return members.map((member) => ({
    kind: member.kind ?? null,
    name: member.name ?? null,
    summary: summaryFrom(member) ?? null,
    type: typeText(member.type),
    privacy: member.privacy ?? null,
    static: member.static ?? false
  }));
}

function summaryFrom(entry) {
  return entry?.summary || entry?.description || undefined;
}

function typeText(type) {
  if (!type) {
    return null;
  }
  if (typeof type === "string") {
    return type;
  }
  return type.text ?? null;
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
