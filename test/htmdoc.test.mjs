import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { cemManifestToHtmlExtraction } from "../packages/cem-adapter/src/index.mjs";
import { htmlExtractionToHiaDocument } from "../packages/html-doc-adapter/src/index.mjs";
import { extractHtmlDoc } from "../packages/html-doc-extractor/src/index.mjs";
import { parseHtml } from "../packages/html-parser/src/index.mjs";

const fixture = await readFile(new URL("../fixtures/basic.html", import.meta.url), "utf8");
const webComponentManifest = JSON.parse(await readFile(new URL("../fixtures/web-components/custom-elements.json", import.meta.url), "utf8"));
const webComponentTemplate = await readFile(new URL("../fixtures/web-components/template.html", import.meta.url), "utf8");

test("parseHtml wraps parse5 with source locations", () => {
  const parsed = parseHtml(fixture, { path: "fixtures/basic.html", fragment: true });
  assert.equal(parsed.parser.name, "parse5");
  assert.equal(parsed.source.path, "fixtures/basic.html");
  assert.equal(parsed.diagnostics.length, 0);
});

test("extractHtmlDoc maps unprefixed annotations to HTMDoc symbols", () => {
  const artifact = extractHtmlDoc(fixture, { path: "fixtures/basic.html", fragment: true });
  const kinds = artifact.symbols.map((symbol) => symbol.kind);

  assert.equal(artifact.contract, "hia-htmdoc-extraction");
  assert.ok(kinds.includes("html-component"));
  assert.ok(kinds.includes("html-attribute"));
  assert.ok(kinds.includes("html-slot"));
  assert.ok(kinds.includes("html-event"));
  assert.ok(kinds.includes("html-style-hook"));
  assert.ok(kinds.includes("html-a11y-note"));
  assert.equal(artifact.source.sourcesContent, undefined);
});

test("htmlExtractionToHiaDocument emits a core document compatible shape", () => {
  const artifact = extractHtmlDoc(fixture, { path: "fixtures/basic.html", fragment: true });
  const document = htmlExtractionToHiaDocument(artifact, { title: "Alert" });

  assert.equal(document.schemaVersion, "0.2.0");
  assert.equal(document.title, "Alert");
  assert.equal(document.symbols[0].kind, "html-component");
  assert.equal(document.symbols[0].source.model, "hia-source");
  assert.equal(document.symbols[0].source.definedIn.relativePath, "fixtures/basic.html");
});

test("cemManifestToHtmlExtraction bridges Custom Elements Manifest symbols", () => {
  const artifact = cemManifestToHtmlExtraction({
    schemaVersion: "1.0.0",
    modules: [
      {
        path: "src/x-alert.js",
        declarations: [
          {
            name: "XAlert",
            tagName: "x-alert",
            description: "Custom alert element.",
            attributes: [{ name: "variant", description: "Visual variant." }],
            events: [{ name: "close", description: "Dismiss event." }],
            slots: [{ name: "default", description: "Message content." }],
            cssParts: [{ name: "button", description: "Close button." }],
            cssProperties: [{ name: "--alert-color", description: "Text color." }]
          }
        ]
      }
    ]
  });

  assert.equal(artifact.contract, "hia-htmdoc-extraction");
  assert.ok(artifact.symbols.some((symbol) => symbol.kind === "html-component" && symbol.name === "x-alert"));
  assert.ok(artifact.symbols.some((symbol) => symbol.kind === "html-event" && symbol.name === "close"));
  assert.ok(artifact.symbols.some((symbol) => symbol.kind === "html-style-hook" && symbol.name === "--alert-color"));
});

test("web components fixture covers CEM and HTML template surfaces", () => {
  const cemArtifact = cemManifestToHtmlExtraction(webComponentManifest, { path: "fixtures/web-components/custom-elements.json" });
  const htmlArtifact = extractHtmlDoc(webComponentTemplate, { path: "fixtures/web-components/template.html", fragment: true });
  const cemDocument = htmlExtractionToHiaDocument(cemArtifact, { title: "CEM Fixture" });
  const htmlDocument = htmlExtractionToHiaDocument(htmlArtifact, { title: "HTML Fixture" });

  assert.ok(cemArtifact.symbols.some((symbol) => symbol.kind === "html-event" && symbol.name === "hia-card-dismiss"));
  assert.ok(cemArtifact.symbols.some((symbol) => symbol.kind === "html-style-hook" && symbol.name === ":state(selected)"));
  assert.ok(cemArtifact.symbols.some((symbol) => symbol.kind === "html-example"));
  assert.ok(htmlArtifact.symbols.some((symbol) => symbol.kind === "html-template" && symbol.name === "hia-card-template"));
  assert.equal(cemDocument.symbols.length, cemArtifact.symbols.length);
  assert.equal(htmlDocument.symbols.length, htmlArtifact.symbols.length);
});
