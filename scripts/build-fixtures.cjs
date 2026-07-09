const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const webComponentsRoot = path.join(root, "fixtures", "web-components");
const dist = path.join(webComponentsRoot, "dist");

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const [
    { cemManifestToHtmlExtraction },
    { extractHtmlDoc },
    { htmlExtractionToHiaDocument }
  ] = await Promise.all([
    import(pathToFileURL(path.join(root, "packages", "cem-adapter", "src", "index.mjs"))),
    import(pathToFileURL(path.join(root, "packages", "html-doc-extractor", "src", "index.mjs"))),
    import(pathToFileURL(path.join(root, "packages", "html-doc-adapter", "src", "index.mjs")))
  ]);

  await fs.mkdir(dist, { recursive: true });

  const cemRelativePath = "fixtures/web-components/custom-elements.json";
  const cemManifest = JSON.parse(await fs.readFile(path.join(root, cemRelativePath), "utf8"));
  const cemArtifact = cemManifestToHtmlExtraction(cemManifest, { path: cemRelativePath });
  const cemDocument = htmlExtractionToHiaDocument(cemArtifact, {
    id: "htmdoc:web-components:cem",
    title: "Web Components CEM Fixture"
  });

  const htmlRelativePath = "fixtures/web-components/template.html";
  const htmlSource = await fs.readFile(path.join(root, htmlRelativePath), "utf8");
  const htmlArtifact = extractHtmlDoc(htmlSource, { path: htmlRelativePath, fragment: true });
  const htmlDocument = htmlExtractionToHiaDocument(htmlArtifact, {
    id: "htmdoc:web-components:html",
    title: "Web Components HTML Fixture"
  });

  await writeJson(path.join(dist, "custom-elements.htmdoc.json"), cemArtifact);
  await writeJson(path.join(dist, "custom-elements.hia.json"), cemDocument);
  await writeJson(path.join(dist, "template.htmdoc.json"), htmlArtifact);
  await writeJson(path.join(dist, "template.hia.json"), htmlDocument);

  console.log("HTMDoc Web Components fixture artifacts generated.");
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
